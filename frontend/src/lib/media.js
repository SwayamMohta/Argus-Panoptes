import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { api } from './api';

export const MAX_IMAGE_BYTES = 1_048_576;

// Re-encoding through ImageManipulator strips EXIF metadata.
export async function prepareImage(uri) {
  if (!uri || uri.startsWith('http')) return null;
  let width = 1600;
  let compress = 0.85;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const result = await manipulateAsync(
      uri,
      [{ resize: { width } }],
      { compress, format: SaveFormat.JPEG }
    );
    const info = await FileSystem.getInfoAsync(result.uri);
    const size = info?.size || 0;
    if (size > 0 && size <= MAX_IMAGE_BYTES) {
      return { uri: result.uri, contentType: 'image/jpeg', sizeBytes: size };
    }
    if (compress > 0.55) compress -= 0.15;
    else width = Math.max(640, Math.round(width * 0.75));
  }
  throw new Error('Could not compress this photo below 1 MiB. Try a different photo.');
}

export async function uploadImage(uri, kind = 'evidence') {
  const prepared = await prepareImage(uri);
  if (!prepared) return null;

  const signed = await api.uploadUrl({
    kind,
    contentType: prepared.contentType,
    sizeBytes: prepared.sizeBytes,
  });
  const result = await FileSystem.uploadAsync(signed.uploadUrl, prepared.uri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      'Content-Type': prepared.contentType,
      'x-upsert': 'false',
    },
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error('Photo upload failed. Please try again.');
  }
  return signed.path;
}

export async function uploadAvatar(uri) {
  const path = await uploadImage(uri, 'avatar');
  if (!path) return null;
  await api.attachAvatar(path);
  return path;
}

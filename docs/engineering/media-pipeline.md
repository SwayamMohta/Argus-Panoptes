# Media Pipeline — Evidence and Avatars

> Status: backend implemented (Phase 4); client compression is implemented during the Phase 9 cut-over. Supabase buckets and policies are configured on project `ndcmhjdssxnhjlovxyaj`.

## 1. Hard limits

| Rule | Value | Enforced by |
|---|---|---|
| Maximum upload size | **1,048,576 bytes (1 MiB)** | API check + Supabase bucket `file_size_limit` + confirm-time `HEAD` check |
| Allowed types | `image/jpeg`, `image/png`, `image/webp` | API literal + bucket `allowed_mime_types` + confirm-time content type |
| Rejected types | SVG, GIF, HEIC/HEIF, anything non-image | API rejects before a signed URL is issued |
| Evidence bucket | `evidence`, **private** | Supabase |
| Avatar bucket | `avatars`, **public read** | Supabase |
| Object path | `{user_id}/{random}.{ext}` | API generates; Storage RLS requires folder = `auth.uid()` |
| Signed upload URL lifetime | 2 hours (Supabase) | Supabase Storage |
| Signed evidence download URL | 1 hour by default (`SIGNED_URL_TTL_SECONDS`) | API |

## 2. Can it be under 1 MiB without looking worse?

**Yes, in the practical sense.** A 12 MP phone photo cannot be made smaller with *bit-identical* pixels, but it can be made **visually lossless**: the re-encoded image looks the same at normal viewing because discarded detail is below what the eye resolves on a phone screen.

The target is "no perceptible difference from the original at normal viewing", not "identical file". Never claim bit-identical compression.

## 3. Client compression contract (Phase 9)

Use `expo-image-manipulator` (works in Expo Go) and `expo-file-system` to check the encoded size. Re-encoding also drops EXIF, including GPS.

Algorithm, applied to the **original** file each attempt (never re-compress the previous output):

1. Read the source dimensions and size.
2. Attempt ladder, stopping at the first result `<= 1,048,576` bytes:
   1. resize longest edge to **2048 px**, JPEG quality **0.90**
   2. 2048 px, quality **0.85**
   3. 2048 px, quality **0.80**
   4. 1600 px, quality **0.85**
   5. 1600 px, quality **0.80**
   6. 1280 px, quality **0.80**
3. If nothing fits, **reject** with "Photo is too large; move closer or retake" — do not downscale below 1280 px or below quality 0.80, because text, plates, and hairline cracks stop being legible.
4. Always save as JPEG for camera photos. Keep PNG only for screenshots/diagrams and run it through the same size check (lossless PNG compression first; convert to JPEG only if the user accepts).
5. Verify the final file with `FileSystem.getInfoAsync(uri).size` before requesting an upload URL.
6. Send the compressed file, not the original.

Why this order: quality reductions are less visible than resolution loss for a phone photo; keep 2048 px as long as possible, then step resolution down.

## 4. Why compression is client-side

- Vercel functions have a 4.5 MB body limit and no image libraries; re-encoding server-side would add memory/latency and duplicate work.
- The upload goes directly to Supabase Storage; bytes never pass through FastAPI.
- The server still enforces the ceiling: bucket limit + confirm-time metadata check, so a lying client cannot attach an oversized object.

## 5. Flow

1. `POST /api/v1/media/upload-url` with `{kind, contentType, sizeBytes}`.
   - Rejects declared sizes > 1 MiB and non-image types.
   - Returns `{bucket, path, token, uploadUrl}`; the path is scoped to the caller.
2. Client `PUT`s the compressed bytes to `uploadUrl` with the token (Supabase signed-upload flow).
3. Evidence: `POST /api/v1/issues/{id}/image` with `{path, caption}`.
   - Author only; path must start with the caller's UUID; object must exist and be ≤ 1 MiB with an allowed content type.
4. Avatar: `POST /api/v1/users/me/avatar` with `{path}` (same validation, avatar bucket).
5. Evidence display: `GET /api/v1/issues/{id}/image-url` returns a short-lived signed URL.
   Avatars: public URL `{SUPABASE_URL}/storage/v1/object/public/avatars/{path}`.
6. Orphan cleanup (download URL requested but never attached) is deferred; see `technical-debt.md`.

## 6. Storage policies (live)

- `evidence_insert_own_folder` / `avatars_insert_own_folder`: authenticated users may insert only where the first path folder equals `auth.uid()`.
- `evidence_select_authenticated` / `avatars_select_authenticated`: authenticated reads; evidence URLs are still signed and short-lived.
- No update/delete policies for clients; cleanup runs server-side later.

Backend signing uses the caller's access token by default (Storage RLS enforces ownership). If `SUPABASE_SERVICE_ROLE_KEY` is configured, the backend uses it instead; the key must never reach the app bundle.

## 7. Attribution and privacy

- Strip EXIF client-side before upload; the server cannot do it on Vercel.
- Never log object paths together with exact coordinates or user identifiers.
- Evidence is private; do not make the bucket public to simplify the client.

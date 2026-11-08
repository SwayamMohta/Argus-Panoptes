import { api } from './api';

// Evidence lives in a private bucket; signed URLs require a session.
export async function enrichIssueImages(items, { resolution = false, enabled = true } = {}) {
  if (!enabled) return items;
  return Promise.all(
    items.map(async (issue) => {
      let image = issue.image || null;
      let resolvedImage = issue.resolvedImage || null;
      try {
        if (!image && issue.imagePath) {
          image = (await api.issueImageUrl(issue.id)).url;
        }
        if (resolution && !resolvedImage && issue.resolvedImagePath) {
          resolvedImage = (await api.resolutionImageUrl(issue.id)).url;
        }
      } catch {
        // Guests or missing objects simply see the category placeholder.
      }
      return image === issue.image && resolvedImage === issue.resolvedImage
        ? issue
        : { ...issue, image, resolvedImage };
    })
  );
}

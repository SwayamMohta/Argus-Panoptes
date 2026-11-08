import { SUPABASE_URL } from './supabase';

// Acceptance envelope around the GHMC KML coverage. Ward assignment still uses
// ST_Covers; points inside this envelope but outside every ward are unmatched.
export const HYDERABAD_BOUNDS = {
  minLat: 17.27,
  maxLat: 17.6,
  minLon: 78.22,
  maxLon: 78.65,
};

export function isInHyderabad(lat, lon) {
  return (
    lat >= HYDERABAD_BOUNDS.minLat &&
    lat <= HYDERABAD_BOUNDS.maxLat &&
    lon >= HYDERABAD_BOUNDS.minLon &&
    lon <= HYDERABAD_BOUNDS.maxLon
  );
}

export const STATUS_LABELS = {
  reported: 'Reported',
  under_review: 'Under Review',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

export function timeAgo(value) {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export function formatDateTime(value) {
  if (!value) return 'Pending';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Pending';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function avatarUrl(path) {
  return path && SUPABASE_URL
    ? `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}`
    : '';
}

export function adaptIssue(issue, extras = {}) {
  return {
    ...issue,
    location: issue.location,
    authorBadge: issue.isAnonymous ? 'Anonymous' : 'Citizen',
    timeAgo: timeAgo(issue.createdAt),
    image: extras.image || null,
    resolvedImage: extras.resolvedImage || null,
    imageCaption: issue.imageCaption,
    comments: extras.comments || [],
    timeline: (issue.timeline || []).map((step) => ({
      ...step,
      date: step.date ? formatDateTime(step.date) : 'Pending',
    })),
  };
}

export function adaptComment(comment) {
  return {
    ...comment,
    authorBadge: comment.isOfficial
      ? 'Official'
      : comment.isAnonymous
        ? 'Anonymous'
        : 'Citizen',
    timeAgo: timeAgo(comment.createdAt),
    replies: (comment.replies || []).map(adaptComment),
  };
}

export function adaptCommentsPage(page) {
  return {
    ...page,
    items: (page.items || []).map(adaptComment),
  };
}

export function adaptProfile(profile) {
  return {
    ...profile,
    name: profile.displayName,
    ward: profile.area || '',
    avatarUri: avatarUrl(profile.avatarPath),
    score: `${Math.round(profile.scorePercentage || 0)}%`,
    digiLockerVerified: Boolean(profile.digilockerVerified),
  };
}

export function adaptNotice(notice) {
  return {
    ...notice,
    publishedDate: formatDate(notice.publishedDate),
    expiryDate: notice.expiryDate ? formatDate(notice.expiryDate) : null,
  };
}

// "93-BANJARA HILLS" -> display name "BANJARA HILLS", ward number "93".
export function adaptWard(ward) {
  const [number, ...rest] = (ward.name || '').split('-');
  const name = rest.length ? rest.join('-') : ward.name;
  return {
    ...ward,
    name,
    ward: rest.length ? number : '',
    wardName: ward.name,
    zone: ward.zone || '',
    circle: ward.circle || '',
    lat: ward.center?.lat,
    lon: ward.center?.lon,
  };
}

export function categoryById(categories, categoryId) {
  return (categories || []).find((category) => category.id === categoryId) || null;
}

export function issueToActivity(issue) {
  return adaptIssue(issue);
}

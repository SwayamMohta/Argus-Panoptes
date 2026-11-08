import { supabase } from './supabase';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(status, detail, body) {
    super(typeof detail === 'string' ? detail : `Request failed (${status})`);
    this.status = status;
    this.detail = detail;
    this.body = body;
  }
}

export const apiConfigured = Boolean(API_URL);

async function accessToken() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

async function request(path, { method = 'GET', body, auth = true, raw = false } = {}) {
  if (!API_URL) throw new ApiError(0, 'EXPO_PUBLIC_API_URL is not set');
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = await accessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new ApiError(0, 'Cannot reach the Argus API. Check EXPO_PUBLIC_API_URL and Wi-Fi.');
  }

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      const raw = payload.detail ?? payload.error?.message;
      if (Array.isArray(raw)) {
        detail = raw
          .map((item) => {
            const location = Array.isArray(item.loc)
              ? item.loc.filter((part) => part !== 'body').join('.')
              : '';
            return `${location ? `${location}: ` : ''}${item.msg || 'Invalid value'}`;
          })
          .join(' | ');
      } else if (typeof raw === 'string') {
        detail = raw;
      } else if (raw) {
        detail = typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
      }
    } catch {
      // Non-JSON error body.
    }
    if (response.status === 401 && supabase) await supabase.auth.signOut();
    throw new ApiError(response.status, detail);
  }

  if (raw) return response;
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? response.json() : response.text();
}

function query(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const suffix = search.toString();
  return suffix ? `?${suffix}` : '';
}

export const api = {
  // Auth/profile
  me: () => request('/api/v1/users/me'),
  updateMe: (fields) => request('/api/v1/users/me', { method: 'PATCH', body: fields }),
  preferences: () => request('/api/v1/users/me/preferences'),
  updatePreferences: (fields) =>
    request('/api/v1/users/me/preferences', { method: 'PATCH', body: fields }),
  deleteAccount: () => request('/api/v1/users/me', { method: 'DELETE' }),

  // Reference
  categories: () => request('/api/v1/categories', { auth: false }),
  notices: (params) => request(`/api/v1/notices${query(params)}`, { auth: false }),
  serviceStandards: () => request('/api/v1/service-standards', { auth: false }),
  wards: (params) => request(`/api/v1/wards${query(params)}`, { auth: false }),
  ward: (id) => request(`/api/v1/wards/${id}`, { auth: false }),
  areaAt: (lat, lon) => request(`/api/v1/areas/at${query({ lat, lon })}`, { auth: false }),
  nearestAreas: (lat, lon, limit = 3) =>
    request(`/api/v1/areas/nearest${query({ lat, lon, limit })}`, { auth: false }),
  reverseGeocode: (lat, lon) =>
    request(`/api/v1/geocode/reverse${query({ lat, lon })}`),

  // Issues (optional auth personalizes userVote/userConfirmed)
  issues: (params) => request(`/api/v1/issues${query(params)}`),
  issue: (id) => request(`/api/v1/issues/${id}`),
  createIssue: (payload) => request('/api/v1/issues', { method: 'POST', body: payload }),
  voteIssue: (id, direction) =>
    request(`/api/v1/issues/${id}/vote`, { method: 'POST', body: { direction } }),
  confirmIssue: (id, lat, lon) =>
    request(`/api/v1/issues/${id}/confirm`, { method: 'POST', body: { lat, lon } }),
  comments: (id, page = 1, limit = 50) =>
    request(`/api/v1/issues/${id}/comments${query({ page, limit })}`),
  addComment: (id, payload) =>
    request(`/api/v1/issues/${id}/comments`, { method: 'POST', body: payload }),
  voteComment: (id, direction) =>
    request(`/api/v1/comments/${id}/vote`, { method: 'POST', body: { direction } }),

  // Media
  uploadUrl: (payload) => request('/api/v1/media/upload-url', { method: 'POST', body: payload }),
  attachIssueImage: (id, path, caption) =>
    request(`/api/v1/issues/${id}/image`, { method: 'POST', body: { path, caption } }),
  issueImageUrl: (id) => request(`/api/v1/issues/${id}/image-url`),
  resolutionImageUrl: (id) => request(`/api/v1/issues/${id}/resolution-image-url`),
  attachAvatar: (path) => request('/api/v1/users/me/avatar', { method: 'POST', body: { path } }),

  // Civic tools
  activity: (tab, page = 1, limit = 20) =>
    request(`/api/v1/users/me/activity${query({ tab, page, limit })}`),
  audits: (page = 1, limit = 20) =>
    request(`/api/v1/users/me/audits${query({ page, limit })}`),
  impact: () => request('/api/v1/users/me/impact'),
  favorites: () => request('/api/v1/users/me/favorites'),
  addFavorite: (payload) => request('/api/v1/users/me/favorites', { method: 'POST', body: payload }),
  updateFavorite: (id, payload) =>
    request(`/api/v1/users/me/favorites/${id}`, { method: 'PATCH', body: payload }),
  deleteFavorite: (id) =>
    request(`/api/v1/users/me/favorites/${id}`, { method: 'DELETE' }),
  exportData: (format) =>
    request(`/api/v1/users/me/export${query({ format })}`, { raw: true }),
  escalate: (payload) => request('/api/v1/sla-escalations', { method: 'POST', body: payload }),
};

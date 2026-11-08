// Tiles are fetched through the FastAPI proxy so the upstream request can send
// the required User-Agent (React Native Image cannot set one reliably).
// The proxy tries OSM, then OSM France/HOT, and caches the result.
// Set EXPO_PUBLIC_TILE_URL only to use a self-hosted/licensed provider.
const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');

const DEFAULT_TILE_URLS = API_URL
  ? [`${API_URL}/api/v1/tiles/{z}/{x}/{y}.png`]
  : [];

const override = process.env.EXPO_PUBLIC_TILE_URL;

export const MAP_TILE_URLS = override ? [override] : DEFAULT_TILE_URLS;

export const MAP_ATTRIBUTION = '© OpenStreetMap contributors';

export function tileUri(template, z, x, y) {
  return template
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y));
}

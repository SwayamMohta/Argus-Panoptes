# Map Tiles

The app loads raster tiles through the **FastAPI backend**, not directly from the
device. This is required because React Native's `Image` cannot reliably set a
custom `User-Agent` on Android/iOS, and OSM's volunteer tile servers block app
traffic.

## Current default

```text
EXPO_PUBLIC_API_URL/api/v1/tiles/{z}/{x}/{y}.png
```

No app API key or environment secret is required. The app uses the standard
`Image` network stack to reach its own backend.

## Backend proxy behavior

`GET /api/v1/tiles/{z}/{x}/{y}.png`:

1. Tries the official OSM URL:
   `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
2. If OSM returns a block (`x-blocked` header, non-200, or non-image), falls back to:
   `https://a.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png`
3. Then:
   `https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png`
4. Caches successful tiles in-process (LRU, 1,024 tiles) and returns:
   `Cache-Control: public, max-age=86400` plus `X-Tile-Provider`.

Every upstream request sends:

```text
User-Agent: CivicApp/2.0
```

The user agent is configured by `TILE_USER_AGENT` on the backend. The proxy
validates zoom/tile ranges and does not expose arbitrary URLs.

## Attribution

The app displays **`© OpenStreetMap contributors`**. Do not remove it.

## Important policy caveat

This proxy is a **development/demo bridge**. The OSM Foundation's tile usage
policy does not permit general app-scale use of `tile.openstreetmap.org` without
prior permission; a custom User-Agent identifies the client but does not grant
permission. OSM France/HOT are also volunteer services with their own policies.
For production, use one of:

- an OSMF-approved arrangement or a commercial OSM provider;
- a licensed provider (MapTiler, Stadia, Thunderforest, etc.);
- a self-hosted tile server.

Set `EXPO_PUBLIC_TILE_URL` to a self-hosted or licensed template (must include
`{z}`, `{x}`, `{y}`) and restart Expo with `-c`:

```bash
EXPO_PUBLIC_TILE_URL=https://tiles.example.com/{z}/{x}/{y}.png
```

## Testing

- Backend tests (`tests/test_tiles.py`) cover the OSM block fallback, the
  `CivicApp/2.0` request header, cache headers, out-of-range coordinates, and the
  502 path when every provider fails.
- Live check:
  ```bash
  curl -I http://127.0.0.1:8000/api/v1/tiles/13/4671/3566.png
  ```
  Expect `200 image/png`, `X-Tile-Provider: osm` or `osm-fr`, and a
  `Cache-Control` header.
- Direct device testing on iOS/Android is still required; the proxy removes the
  native User-Agent dependency, but rendering cannot be verified from the
  development machine.

## If the old blocked tile persists

The app may be running an old Metro bundle. Stop Metro and run:

```bash
cd frontend
npx expo start -c
```

Fully close Expo Go and reopen, or clear Expo Go's cache. Confirm the Metro log:

```text
[map] tile provider: http://<PC-LAN-IP>:8000/api/v1/tiles/{z}/{x}/{y}.png
```

and the attribution `© OpenStreetMap contributors`.

# JoyHeart photo processor

This is a separate Node.js service. It is not part of the website's Cloudflare Worker and does not connect to Supabase or store photos. The website remains unchanged until a separately reviewed integration is enabled.

## Runtime

- Node.js 22
- Sharp/libvips for JPEG, PNG and WebP decoding and WebP encoding
- Docker deployment supported

Sharp requires a Node-API-compatible runtime and platform-specific binaries. Use the included Debian-based Node image rather than a Cloudflare Worker runtime.

## Endpoints

- `GET /health` — liveness check; returns no secrets or user data.
- `POST /v1/normalize` — accepts raw image bytes as `application/octet-stream`.

The processing endpoint requires:
- `PHOTO_PROCESSOR_SHARED_SECRET`: at least 32 random bytes, configured only as a server-side secret.
- `X-Photo-Timestamp`: Unix timestamp in seconds or milliseconds.
- `X-Photo-Signature`: lowercase or uppercase hex HMAC-SHA256 of `timestamp + "." + raw request bytes`, using the shared secret.

Requests older than five minutes are rejected. The response is a WebP binary with dimensions, source MIME type, sizes and SHA-256 in response headers. Never expose the shared secret in browser code or `NEXT_PUBLIC_*` variables.

## Image safety

The service caps uploads at 5 MB, accepts only JPEG/PNG/WebP, rejects multi-page/animated images, limits images to 6 megapixels and 8192 pixels per side, auto-orients images, and re-encodes to WebP. It does not log image data, filenames, account identifiers or request signatures.

## Local development

```sh
npm install
PHOTO_PROCESSOR_SHARED_SECRET="$(openssl rand -hex 32)" npm start
```

Health check:

```sh
curl http://localhost:8080/health
```

Run tests with `npm test`.

## Deployment and cutover

Build and deploy this service independently using the included Dockerfile. Configure the same high-entropy shared secret in the service and the website's server-side environment. Do not add the service URL or secret to client-side variables.

The current website upload route is deliberately not changed by this service-only stage. After a real deployed service passes the JPEG, PNG, WebP, corrupt-file, oversized-file and authentication tests, a separate reviewed change can route processing through it. The existing authentication, profile permission checks, five-photo limit, moderation registration and private Supabase storage remain in the website route.

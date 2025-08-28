# Imgur Proxy (Render)

A simple Express proxy for Imgur API that supports two auth modes:

- header: Shared secret sent via X-Proxy-Auth
- hmac: HMAC-SHA256 signature over method, path, timestamp, and content hash

## Environment variables

- PROXY_SECRET: shared secret (required)
- PROXY_AUTH_MODE: header | hmac (default: header)
- PORT: server port (Render provides automatically)

## Endpoints

- POST /3/image (field: video)
- DELETE /3/image/:deleteHash
- GET /health

## Deploy to Render

- Create a new Web Service from this folder
- Runtime: Node 20
- Build Command: pnpm i --frozen-lockfile && pnpm -C proxy-render build
- Start Command: node proxy-render/dist/server.js
- Environment: set PROXY_SECRET and optionally PROXY_AUTH_MODE=hmac

## Client setup

Set GC_PROXY to the service URL. In .env or config file:

- GC_PROXY=https://your-service.onrender.com
- PROXY_SECRET=your-secret
- PROXY_AUTH_MODE=hmac (recommended)

The client will sign upload and delete requests when PROXY_AUTH_MODE=hmac.
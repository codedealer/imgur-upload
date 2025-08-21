# Imgur API Proxy Server (Vercel Serverless)

This Vercel serverless application acts as a secure proxy between your Imgur upload client and the Imgur API. It helps with:

- Centralized API request handling
- Client ID management
- Request logging and monitoring
- Authorization-protected access
- **Free deployment** with generous usage limits

## Security

The proxy uses an `X-Proxy-Auth` header with a secret token to prevent unauthorized access:

- A random 64-character hex secret is generated automatically on deployment
- All API endpoints (except `/health`) require this header
- The secret is set via the `PROXY_SECRET` environment variable

## Deployment

### Prerequisites

1. **Vercel account** (free)
2. **GitHub account** for automated deployment
3. **OR** Vercel CLI for local deployment

### GitHub Actions Deployment (Recommended)

1. Fork the repository
2. Set GitHub secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
3. Run the "Deploy Imgur Proxy to Vercel" workflow
4. Note the generated `PROXY_SECRET` from the workflow output

### Local Deployment

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Install dependencies:
   ```bash
   cd proxy
   pnpm install
   ```

3. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

4. Set environment variables:
   ```bash
   vercel env add PROXY_SECRET production your_generated_secret
   ```

## Usage

After deployment, set the environment variables to use the proxy:

```bash
export GC_PROXY=https://your-project.vercel.app
export PROXY_SECRET=your_generated_secret
```

The client will automatically route requests through the proxy when these variables are set.

## API Endpoints

- `GET /` - Service information (no auth required)
- `GET /health` - Health check (no auth required)
- `POST /api/3/image` - Upload endpoint (requires X-Proxy-Auth header)
- `DELETE /api/3/image/[deleteHash]` - Delete endpoint (requires X-Proxy-Auth header)

## Configuration

The proxy:
- Runs as serverless functions on Vercel
- Forwards requests to `https://api.imgur.com/3/`
- Scales automatically and to zero when unused
- Has generous free tier limits (100GB bandwidth, 1000 serverless function invocations per day)

## Logging

The service logs:
- Incoming requests with client ID (first 8 characters)
- File upload sizes
- Success/error status
- Delete operations
- Invalid authorization attempts

## Cost

- **Vercel Free Tier**: 100GB bandwidth, 1000 function invocations/day
- **Typical usage**: Free for personal use
- **Heavy usage**: ~$20/month for 1TB bandwidth (much cheaper than alternatives)
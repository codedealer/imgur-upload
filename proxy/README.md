# Imgur API Proxy Server

This Google Cloud Run service acts as a secure proxy between your Imgur upload client and the Imgur API. It helps with:

- Centralized API request handling
- Client ID management
- Request logging and monitoring
- Authorization-protected access
- Potential rate limiting (future enhancement)

## Security

The proxy uses an `X-Proxy-Auth` header with a secret token to prevent unauthorized access:

- A random 64-character hex secret is generated automatically on deployment
- All API endpoints (except `/health`) require this header
- The secret is set via the `PROXY_SECRET` environment variable

## Deployment

### Prerequisites

1. Google Cloud SDK installed and configured (for local deployment)
2. Docker installed (for local deployment)
3. **OR** GitHub repository with Actions enabled (recommended)
4. Project with billing enabled
5. Container Registry API enabled

### GitHub Actions Deployment (Recommended)

1. Fork the repository
2. Set GitHub secrets: `GCP_PROJECT_ID` and `GCP_SA_KEY`
3. Run the "Deploy Imgur Proxy to Cloud Run" workflow
4. Note the generated `PROXY_SECRET` from the workflow output

### Local Deployment

**Linux/macOS:**
```bash
chmod +x deploy.sh
./deploy.sh your-project-id us-central1
```

**Windows:**
```cmd
deploy.bat your-project-id us-central1
```

### Manual Deployment

1. Install dependencies:
   ```bash
   cd proxy
   pnpm install
   ```

2. Build TypeScript:
   ```bash
   pnpm run build
   ```

3. Build and push Docker image:
   ```bash
   cd ..
   docker build -t gcr.io/your-project-id/imgur-proxy proxy/
   docker push gcr.io/your-project-id/imgur-proxy
   ```

4. Deploy to Cloud Run:
   ```bash
   gcloud run deploy imgur-proxy \
     --image gcr.io/your-project-id/imgur-proxy \
     --region us-central1 \
     --platform managed \
     --allow-unauthenticated \
     --port 8080 \
     --memory 256Mi \
     --set-env-vars PROXY_SECRET=your_generated_secret
   ```

## Usage

After deployment, set the environment variables to use the proxy:

```bash
export GC_PROXY=https://your-service-url.run.app
export PROXY_SECRET=your_generated_secret
```

The client will automatically route requests through the proxy when these variables are set.

## API Endpoints

- `GET /` - Service information (no auth required)
- `GET /health` - Health check (no auth required)
- `POST /3/image` - Upload endpoint (requires X-Proxy-Auth header)
- `DELETE /3/image/:deleteHash` - Delete endpoint (requires X-Proxy-Auth header)

## Configuration

The proxy server:
- Runs on port 8080 by default
- Forwards requests to `https://api.imgur.com/3/`
- Uses 256Mi RAM and scales to zero when unused
- Auto-generates secure secrets on deployment

## Logging

The service logs:
- Incoming requests with client ID (first 8 characters)
- File upload sizes
- Success/error status
- Delete operations
- Invalid authorization attempts

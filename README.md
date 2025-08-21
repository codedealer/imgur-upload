# Imgur Upload Utility

A command-line tool for uploading videos to Imgur and re-uploading from existing Imgur URLs.

## Setup

1. **IWhen `GC_PROXY` and `PROXY_SECRET` are set, all upload and delete requests will be routed through your secured proxy server.

### Proxy Features

- **Health check endpoint:** `GET /health`
- **Upload proxy:** `POST /api/3/image` (with auth)
- **Delete proxy:** `DELETE /api/3/image/[deleteHash]` (with auth)
- **Request logging:** Tracks uploads and deletes with client ID
- **Serverless auto-scaling:** Handles traffic spikes automatically
- **Free tier friendly:** Generous usage limits, scales to zero when unusedendencies:**
   ```bash
   pnpm install
   ```

2. **Build the project:**
   ```bash
   pnpm run build
   ```

3. **Create desktop shortcuts (optional):**
   ```bash
   setup_shortcuts.bat
   ```

## Usage Methods

### Method 1: Batch Files (Recommended)

#### For uploading local files:
- **Drag & Drop:** Drag video files onto `upload_files.bat`
- **Command line:** `upload_files.bat video1.mp4 video2.mov metadata.json`

#### For re-uploading from Imgur URLs:
- **Interactive mode:** Double-click `reupload_files.bat` and paste URLs when prompted
  - Paste multiple URLs separated by spaces or on separate lines
  - Press Enter on an empty line to start processing
- **Command line:** `reupload_files.bat https://imgur.com/abc123 https://i.imgur.com/def456.mp4`

### Method 2: Direct Node.js

```bash
# Upload local files
pnpm start video1.mp4 video2.mov

# Reupload from URLs
pnpm start https://imgur.com/abc123 https://i.imgur.com/def456.mp4
```

### Method 3: Development Mode

```bash
# Upload local files
pnpm dev video1.mp4 video2.mov

# Reupload from URLs
pnpm dev https://imgur.com/abc123 https://i.imgur.com/def456.mp4
```

## Configuration

The application uses different environment files:

- **Development:** `.env` (project root)
- **Production:** `.env.production` → copied to `dist/.env` during build

### Environment Variables

```bash
CLIENT_ID=your_imgur_client_id
CLIENT_SECRET=your_imgur_client_secret
UPLOAD_TIMEOUT=60000
TEST_MODE=false
VERIFY_UPLOAD=false
MAX_FILE_SIZE_MB=200
CONCURRENT_UPLOADS=1
HTTPS_PROXY=http://127.0.0.1:8080  # Optional
GC_PROXY=https://your-proxy-service.vercel.app  # Optional Vercel serverless proxy
PROXY_SECRET=your_generated_secret_key  # Required when using GC_PROXY
```

## Vercel Serverless Proxy

This project includes a Vercel serverless proxy that can be deployed to handle API requests on your behalf. This is useful for:

- Centralized API credential management
- Request logging and monitoring
- Avoiding direct API calls from your local machine
- Secured access with authorization tokens
- **Free deployment** with generous usage limits

### Deployment Options

#### Option 1: GitHub Actions (Recommended - No local tools required)

1. **Fork this repository** to your GitHub account

2. **Set up Vercel secrets** in your GitHub repository:
   - Go to Settings → Secrets and variables → Actions
   - Add `VERCEL_TOKEN` with your Vercel API token ([get it here](https://vercel.com/account/tokens))
   - Add `VERCEL_ORG_ID` with your Vercel organization ID
   - Add `VERCEL_PROJECT_ID` with your Vercel project ID (create project first on Vercel)

3. **Deploy via GitHub Actions**:
   - Go to Actions tab in your repository
   - Run "Deploy Imgur Proxy to Vercel" workflow
   - The workflow will auto-generate a proxy secret

4. **Configure your client**:
   ```bash
   set GC_PROXY=https://your-project.vercel.app
   set PROXY_SECRET=the_generated_secret_from_workflow
   ```

#### Option 2: Local Deployment (Requires Vercel CLI)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy the proxy:**
   ```bash
   cd proxy
   vercel --prod
   ```

3. **Set environment variables:**
   ```bash
   vercel env add PROXY_SECRET production your_secret_here
   ```

4. **Configure your client:**
   ```bash
   export GC_PROXY=https://your-project.vercel.app
   export PROXY_SECRET=your_proxy_secret
   ```### Proxy Security

The proxy server uses an authorization token (`PROXY_SECRET`) to prevent unauthorized access:

- **Auto-generated**: A random 64-character hex string is generated during deployment
- **Custom**: You can provide your own secret during GitHub Actions deployment
- **Required**: All requests to the proxy must include `X-Proxy-Auth` header with the secret

When `GC_PROXY` and `PROXY_SECRET` are set, all upload and delete requests will be routed through your secured proxy server.

### Proxy Features

- **Health check endpoint:** `GET /health`
- **Upload proxy:** `POST /3/image` (with auth)
- **Delete proxy:** `DELETE /3/image/:deleteHash` (with auth)
- **Request logging:** Tracks uploads and deletes with client ID
- **Auto-scaling:** Handles traffic spikes automatically
- **Low resource usage:** Only 256Mi RAM, scales to zero when unused## Features

### Upload Mode
- Upload local video files to Imgur
- Support for metadata JSON files
- Progress tracking with visual progress bars
- Automatic file verification
- Deletion management interface

### Reupload Mode
- Download videos from Imgur URLs
- Re-upload to get new Imgur links
- Support for both direct links (`i.imgur.com`) and post links (`imgur.com`)
- Automatic format detection and fallback
- Concurrent downloads with rate limiting

## File Structure

```
imgur-upload/
├── src/                    # TypeScript source code
├── dist/                   # Compiled JavaScript + .env
├── upload_files.bat        # Batch file for uploading
├── reupload_files.bat      # Batch file for re-uploading
├── setup_shortcuts.bat     # Creates desktop shortcuts
├── .env                    # Development environment
├── .env.production         # Production environment
└── package.json
```

## Troubleshooting

1. **"Node.js not found":** Install Node.js from https://nodejs.org/
2. **"dist/index.js not found":** Run `pnpm run build`
3. **"dist/.env not found":** Run `pnpm run build` (copies .env.production)
4. **Rate limiting (429 errors):** Reduce `CONCURRENT_UPLOADS` or add delays

## Building Binary

To create a standalone executable:

```bash
pnpm run package
```

This creates a binary in the `bin/` folder that doesn't require Node.js installation.

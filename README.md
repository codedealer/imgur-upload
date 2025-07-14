# Imgur Upload Utility

A command-line tool for uploading videos to Imgur and re-uploading from existing Imgur URLs.

## Setup

1. **Install dependencies:**
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
```

## Features

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

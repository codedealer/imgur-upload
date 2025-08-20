# Quick Setup Guide (No Local Tools Required)

This guide shows how to deploy the Imgur proxy using GitHub Actions, without needing Docker or gcloud CLI installed locally.

## Prerequisites

1. **GitHub account**
2. **Google Cloud account with billing enabled**
3. **Google Cloud project with Cloud Run API enabled**

## Step 1: Create Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **IAM & Admin** → **Service Accounts**
3. Click **Create Service Account**
4. Name: `github-actions-imgur-proxy`
5. Grant roles:
   - **Cloud Run Admin**
   - **Storage Admin** (for Container Registry)
   - **Service Account User**
6. Click **Create Key** → **JSON**
7. **Save the downloaded JSON file** - you'll need it for GitHub

## Step 2: Fork Repository

1. Go to the original repository on GitHub
2. Click **Fork** to create your own copy
3. Clone or use GitHub's web interface

## Step 3: Configure GitHub Secrets

1. In your forked repository, go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** and add:

   **GCP_PROJECT_ID**
   ```
   your-google-cloud-project-id
   ```

   **GCP_SA_KEY**
   ```
   {paste the entire contents of the JSON file from Step 1}
   ```

## Step 4: Deploy via GitHub Actions

1. Go to **Actions** tab in your repository
2. Click **Deploy Imgur Proxy to Cloud Run** workflow
3. Click **Run workflow**
4. Enter:
   - **Project ID**: Your Google Cloud project ID
   - **Region**: `us-central1` (or your preferred region)
   - **Proxy Secret**: Leave empty for auto-generation (recommended)
5. Click **Run workflow**

## Step 5: Get Your Configuration

1. Wait for the workflow to complete (2-3 minutes)
2. Click on the completed workflow run
3. Expand the **Display deployment info** step
4. **Copy and save** the service URL and proxy secret:

   ```bash
   GC_PROXY=https://imgur-proxy-xyz-uc.a.run.app
   PROXY_SECRET=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
   ```

## Step 6: Configure Your Local Client

Add to your `.env` file or set environment variables:

```bash
CLIENT_ID=your_imgur_client_id
GC_PROXY=https://your-service-url-from-step5.run.app
PROXY_SECRET=your_proxy_secret_from_step5
```

## Step 7: Test

Run the proxy test:
```bash
pnpm run test-proxy
```

You should see:
```
✅ GC_PROXY configured: https://...
✅ Proxy health check passed
```

## Troubleshooting

**"Workflow failed"**
- Check that Cloud Run API is enabled in your Google Cloud project
- Verify service account has correct permissions
- Check the workflow logs for detailed error messages

**"Proxy health check failed"**
- Wait a few minutes after deployment
- Check that the service URL is correct
- Verify the service is deployed in Google Cloud Console

**"Invalid proxy authorization"**
- Double-check the `PROXY_SECRET` matches exactly
- Ensure no extra spaces or characters

## Security Notes

- **Save your proxy secret safely** - it's only shown once
- The service URL is public but protected by the secret
- You can regenerate the secret by re-running the workflow
- The proxy automatically scales to zero when not used (no ongoing costs)

## Cost Estimate

- **Cloud Run**: ~$0.40/million requests (first 2 million free)
- **Storage**: Minimal (only for container images)
- **Typical usage**: <$1/month for personal use

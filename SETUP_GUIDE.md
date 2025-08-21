# Quick Setup Guide — Vercel deployment

This guide explains how to deploy the Imgur proxy to Vercel and configure your client. It removes older Cloud Run steps and focuses on a single, clear Vercel flow: GitHub Actions (recommended) or the Vercel CLI.

Prerequisites
1. GitHub account
2. Vercel account (free) — https://vercel.com

Overview
- Recommended: use the included GitHub Actions workflow to build and deploy the `proxy/` folder to Vercel. No local tools required.
- Alternative: use the Vercel CLI locally (if you prefer).

1) Create a Vercel project
- Sign in to Vercel and create a new project. You can import this repo (fork first) or create an empty project and connect it later.
- Note the **Project ID** and **Team (Org) ID** from project/team settings — these are required for GitHub Actions.

2) Prepare GitHub repository
- Fork this repository and push any local changes to your fork's `main` branch.

3) Add GitHub secrets (required for the workflow)
In your fork, go to Settings → Secrets and variables → Actions and add:

- `VERCEL_TOKEN` — your Vercel personal token (create at https://vercel.com/account/tokens)
- `VERCEL_ORG_ID` — your Vercel team/org id (from Vercel dashboard)
- `VERCEL_PROJECT_ID` — your Vercel project id (from project settings)

4) Run the GitHub Actions workflow (recommended)
- In GitHub, go to Actions → "Deploy Imgur Proxy to Vercel"
- Click "Run workflow". Optionally provide a `proxy_secret`; leave empty to auto-generate.
- The workflow will:
   - build `proxy/` with pnpm
   - deploy to Vercel using the `vercel` CLI
   - set `PROXY_SECRET` as a Vercel environment variable (production)

5) Get the deployment details
- After the workflow completes, open the run and expand the final step.
- Copy these values and keep them safe:

```bash
GC_PROXY=https://<your-vercel-deployment>.vercel.app
PROXY_SECRET=<secret-shown-by-workflow>
```

6) Configure your client
- Add to your `.env` or set environment variables locally:

```powershell
setx CLIENT_ID "your_imgur_client_id"
setx GC_PROXY "https://<your-vercel-deployment>.vercel.app"
setx PROXY_SECRET "<secret-shown-by-workflow>"
```

7) Quick local test
- From project root run:

```powershell
pnpm run test-proxy
```

You should see the health check response if the proxy is reachable.

Troubleshooting
- Workflow failed: check GitHub Actions logs and verify that `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are correct.
- Proxy health check failed: wait a minute for Vercel to propagate, then check the deployment URL in the Vercel dashboard.
- Invalid proxy authorization: ensure `PROXY_SECRET` in your client matches the one set in Vercel.

Local deployment (optional)
- If you prefer to deploy locally with the Vercel CLI:

```powershell
cd proxy
pnpm install
vercel --prod
vercel env add PROXY_SECRET production <your_secret>
```

Security notes
- Save the `PROXY_SECRET` securely — it is the access token for the proxy.
- The proxy requires `X-Proxy-Auth` header with the secret, in addition to `Authorization: Client-ID <id>` for Imgur.

Costs and limits
- Vercel Free Tier is usually sufficient for personal use (bandwidth and function limits apply).
- For higher usage, upgrade your Vercel plan.

Done.

#!/bin/bash

# Vercel Deployment Script for Imgur Proxy
# Usage: ./deploy-vercel.sh

set -e

echo "🚀 Starting deployment to Vercel..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Error: Vercel CLI is not installed."
    echo "Install it with: npm install -g vercel"
    exit 1
fi

# Navigate to proxy directory
cd proxy

echo "📦 Installing dependencies..."
pnpm install

echo "☁️  Deploying to Vercel..."
vercel --prod

echo "🔐 Setting up environment variables..."
echo "Please enter your proxy secret (or press Enter to generate one):"
read -r PROXY_SECRET

if [ -z "$PROXY_SECRET" ]; then
    PROXY_SECRET=$(openssl rand -hex 32)
    echo "Generated proxy secret: $PROXY_SECRET"
fi

# Set environment variable
vercel env add PROXY_SECRET production "$PROXY_SECRET" || echo "Environment variable may already exist"

echo "✅ Deployment completed successfully!"

# Get the deployment URL
DEPLOYMENT_URL=$(vercel ls | grep imgur-proxy | head -1 | awk '{print "https://" $2}')

echo ""
echo "🌐 Your service is available at: $DEPLOYMENT_URL"
echo "🔍 Health check: $DEPLOYMENT_URL/health"
echo ""
echo "To use the proxy, set the environment variables:"
echo "export GC_PROXY=$DEPLOYMENT_URL"
echo "export PROXY_SECRET=$PROXY_SECRET"
echo ""
echo "⚠️  IMPORTANT: Save the PROXY_SECRET above - you'll need it for your client!"

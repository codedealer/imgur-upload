#!/bin/bash

# Google Cloud Run Deployment Script for Imgur Proxy
# Usage: ./deploy.sh [PROJECT_ID] [REGION]

set -e

PROJECT_ID=${1:-"your-project-id"}
REGION=${2:-"us-central1"}
SERVICE_NAME="imgur-proxy"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Starting deployment to Google Cloud Run..."
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Service Name: $SERVICE_NAME"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Navigate to proxy directory
cd proxy

echo "📦 Installing dependencies..."
pnpm install

echo "🔨 Building TypeScript..."
pnpm run build

# Go back to root directory for Docker build
cd ..

echo "🐳 Building Docker image..."
docker build -t $IMAGE_NAME proxy/

echo "📤 Pushing image to Google Container Registry..."
docker push $IMAGE_NAME

echo "☁️  Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --memory 256Mi \
    --cpu 1 \
    --max-instances 10 \
    --timeout 300 \
    --project $PROJECT_ID

echo "✅ Deployment completed successfully!"

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)' --project $PROJECT_ID)

echo ""
echo "🌐 Your service is available at: $SERVICE_URL"
echo "🔍 Health check: $SERVICE_URL/health"
echo ""
echo "To use the proxy, set the GC_PROXY environment variable:"
echo "export GC_PROXY=$SERVICE_URL"

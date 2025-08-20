@echo off
REM Google Cloud Run Deployment Script for Imgur Proxy (Windows)
REM Usage: deploy.bat [PROJECT_ID] [REGION]

setlocal enabledelayedexpansion

set PROJECT_ID=%1
set REGION=%2

if "%PROJECT_ID%"=="" set PROJECT_ID=your-project-id
if "%REGION%"=="" set REGION=us-central1

set SERVICE_NAME=imgur-proxy
set IMAGE_NAME=gcr.io/%PROJECT_ID%/%SERVICE_NAME%

echo 🚀 Starting deployment to Google Cloud Run...
echo Project ID: %PROJECT_ID%
echo Region: %REGION%
echo Service Name: %SERVICE_NAME%

REM Check if gcloud is installed
where gcloud >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Error: gcloud CLI is not installed. Please install it first.
    exit /b 1
)

REM Navigate to proxy directory
cd proxy

echo 📦 Installing dependencies...
call pnpm install
if %ERRORLEVEL% neq 0 (
    echo ❌ Error: Failed to install dependencies
    exit /b 1
)

echo 🔨 Building TypeScript...
call pnpm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Error: Failed to build TypeScript
    exit /b 1
)

REM Go back to root directory for Docker build
cd ..

echo 🐳 Building Docker image...
docker build -t %IMAGE_NAME% proxy/
if %ERRORLEVEL% neq 0 (
    echo ❌ Error: Failed to build Docker image
    exit /b 1
)

echo 📤 Pushing image to Google Container Registry...
docker push %IMAGE_NAME%
if %ERRORLEVEL% neq 0 (
    echo ❌ Error: Failed to push Docker image
    exit /b 1
)

echo ☁️  Deploying to Cloud Run...
gcloud run deploy %SERVICE_NAME% ^
    --image %IMAGE_NAME% ^
    --region %REGION% ^
    --platform managed ^
    --allow-unauthenticated ^
    --port 8080 ^
    --memory 256Mi ^
    --cpu 1 ^
    --max-instances 10 ^
    --timeout 300 ^
    --project %PROJECT_ID%

if %ERRORLEVEL% neq 0 (
    echo ❌ Error: Failed to deploy to Cloud Run
    exit /b 1
)

echo ✅ Deployment completed successfully!

REM Get the service URL
for /f "usebackq tokens=*" %%i in (`gcloud run services describe %SERVICE_NAME% --platform managed --region %REGION% --format "value(status.url)" --project %PROJECT_ID%`) do set SERVICE_URL=%%i

echo.
echo 🌐 Your service is available at: %SERVICE_URL%
echo 🔍 Health check: %SERVICE_URL%/health
echo.
echo To use the proxy, set the GC_PROXY environment variable:
echo set GC_PROXY=%SERVICE_URL%

endlocal

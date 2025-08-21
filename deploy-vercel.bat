@echo off
REM Vercel Deployment Script for Imgur Proxy (Windows)
REM Usage: deploy-vercel.bat

setlocal enabledelayedexpansion

echo 🚀 Starting deployment to Vercel...

REM Check if vercel CLI is installed
where vercel >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Error: Vercel CLI is not installed.
    echo Install it with: npm install -g vercel
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

echo ☁️  Deploying to Vercel...
call vercel --prod
if %ERRORLEVEL% neq 0 (
    echo ❌ Error: Failed to deploy to Vercel
    exit /b 1
)

echo 🔐 Setting up environment variables...
set /p PROXY_SECRET="Please enter your proxy secret (or press Enter to generate one): "

if "%PROXY_SECRET%"=="" (
    REM Generate a random hex string (simplified approach for Windows)
    set PROXY_SECRET=
    for /L %%i in (1,1,64) do (
        set /a "rand=!random! %% 16"
        if !rand! lss 10 (
            set "hex=!rand!"
        ) else (
            if !rand! == 10 set "hex=a"
            if !rand! == 11 set "hex=b"
            if !rand! == 12 set "hex=c"
            if !rand! == 13 set "hex=d"
            if !rand! == 14 set "hex=e"
            if !rand! == 15 set "hex=f"
        )
        set "PROXY_SECRET=!PROXY_SECRET!!hex!"
    )
    echo Generated proxy secret: !PROXY_SECRET!
)

REM Set environment variable
call vercel env add PROXY_SECRET production "%PROXY_SECRET%" || echo Environment variable may already exist

echo ✅ Deployment completed successfully!

REM Get deployment info (simplified for Windows)
echo.
echo 🌐 Check your deployment URL in Vercel dashboard
echo 🔍 Health check: https://your-project.vercel.app/health
echo.
echo To use the proxy, set the environment variables:
echo set GC_PROXY=https://your-project.vercel.app
echo set PROXY_SECRET=%PROXY_SECRET%
echo.
echo ⚠️  IMPORTANT: Save the PROXY_SECRET above - you'll need it for your client!

endlocal

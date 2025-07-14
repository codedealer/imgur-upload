@echo off
setlocal

:: Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"

:: Change to the script directory to ensure relative paths work
cd /d "%SCRIPT_DIR%"

:: Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if dist folder exists
if not exist "dist\index.js" (
    echo Error: dist\index.js not found
    echo Please run 'pnpm run build' first to build the project
    pause
    exit /b 1
)

:: Check if .env file exists in dist
if not exist "dist\.env" (
    echo Error: dist\.env not found
    echo Please run 'pnpm run build' to copy the environment file
    pause
    exit /b 1
)

:: If no arguments provided, show usage
if "%~1"=="" (
    echo Usage: Drag and drop video files onto this batch file
    echo or run: upload_files.bat file1.mp4 file2.mov [metadata.json]
    pause
    exit /b 1
)

:: Set NODE_ENV to production and change to dist directory
set NODE_ENV=production
cd dist

:: Call the script with all provided arguments
echo Starting upload process...
node index.js %*

:: Pause to see results
pause

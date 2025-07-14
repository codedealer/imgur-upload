@echo off
setlocal enabledelayedexpansion

echo =================================
echo    IMGUR UPLOAD SETUP UTILITY
echo =================================
echo.

:: Get the current directory
set "CURRENT_DIR=%~dp0"
set "CURRENT_DIR=%CURRENT_DIR:~0,-1%"

:: Check if batch files exist
if not exist "%CURRENT_DIR%\upload_files.bat" (
    echo Error: upload_files.bat not found in current directory
    pause
    exit /b 1
)

if not exist "%CURRENT_DIR%\reupload_files.bat" (
    echo Error: reupload_files.bat not found in current directory
    pause
    exit /b 1
)

echo This script will create desktop shortcuts for:
echo 1. Upload Files - for uploading local video files
echo 2. Reupload Files - for re-uploading from Imgur URLs
echo.

set /p "choice=Create shortcuts? (y/n): "
if /i not "%choice%"=="y" (
    echo Setup cancelled.
    pause
    exit /b 0
)

:: Create VBS script to create shortcuts
set "vbs_script=%TEMP%\create_shortcuts.vbs"

echo Set WshShell = WScript.CreateObject("WScript.Shell") > "%vbs_script%"
echo. >> "%vbs_script%"
echo ' Create Upload Files shortcut >> "%vbs_script%"
echo Set uploadLink = WshShell.CreateShortcut(WshShell.SpecialFolders("Desktop") ^& "\Imgur Upload Files.lnk") >> "%vbs_script%"
echo uploadLink.TargetPath = "%CURRENT_DIR%\upload_files.bat" >> "%vbs_script%"
echo uploadLink.WorkingDirectory = "%CURRENT_DIR%" >> "%vbs_script%"
echo uploadLink.Description = "Upload video files to Imgur" >> "%vbs_script%"
echo uploadLink.Save >> "%vbs_script%"
echo. >> "%vbs_script%"
echo ' Create Reupload Files shortcut >> "%vbs_script%"
echo Set reuploadLink = WshShell.CreateShortcut(WshShell.SpecialFolders("Desktop") ^& "\Imgur Reupload Files.lnk") >> "%vbs_script%"
echo reuploadLink.TargetPath = "%CURRENT_DIR%\reupload_files.bat" >> "%vbs_script%"
echo reuploadLink.WorkingDirectory = "%CURRENT_DIR%" >> "%vbs_script%"
echo reuploadLink.Description = "Reupload files from Imgur URLs" >> "%vbs_script%"
echo reuploadLink.Save >> "%vbs_script%"

:: Execute the VBS script
cscript //nologo "%vbs_script%"

:: Clean up
del "%vbs_script%"

echo.
echo Setup complete!
echo.
echo Desktop shortcuts created:
echo - "Imgur Upload Files.lnk" - Drag video files onto this
echo - "Imgur Reupload Files.lnk" - Click to enter Imgur URLs
echo.
echo You can also copy these shortcuts anywhere you want.
echo.
pause

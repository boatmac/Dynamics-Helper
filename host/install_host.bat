@echo off
set "HOST_NAME=com.microsoft.dynamics.helper"
set "HOST_DESC=Dynamics Helper Native Host"

echo ==========================================
echo   Dynamics Helper - Native Host Installer
echo ==========================================
echo.
echo Step 1: Install Extension
echo -------------------------
echo 1. Open Edge or Chrome.
echo 2. Go to Extensions page (edge://extensions or chrome://extensions).
echo 3. Enable "Developer mode".
echo 4. Click "Load unpacked" and select the "extension" folder in this package.
echo.
echo Step 2: Configure Host
echo ----------------------
set /p EXT_ID="Enter the Extension ID from the browser (e.g. 'abcdef...'): "

if "%EXT_ID%"=="" (
    echo Error: Extension ID is required.
    pause
    exit /b
)

REM 1. Copy Native Host Executable
echo.
echo Copying Native Host to %APPDATA%\DynamicsHelper...
if not exist "%APPDATA%\DynamicsHelper" mkdir "%APPDATA%\DynamicsHelper"
copy /Y "dh_native_host.exe" "%APPDATA%\DynamicsHelper\"
copy /Y "config.json" "%APPDATA%\DynamicsHelper\"
copy /Y "copilot-instructions.md" "%APPDATA%\DynamicsHelper\"

REM 2. Create Manifest
echo Creating Manifest...
(
echo {
echo   "name": "%HOST_NAME%",
echo   "description": "%HOST_DESC%",
echo   "path": "dh_native_host.exe",
echo   "type": "stdio",
echo   "allowed_origins": [
echo     "chrome-extension://%EXT_ID%/",
echo     "extension://%EXT_ID%/"
echo   ]
echo }
) > "%APPDATA%\DynamicsHelper\manifest.json"

REM 3. Register Native Host in Registry
echo Registering Native Host...
reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\%HOST_NAME%" /ve /t REG_SZ /d "%APPDATA%\DynamicsHelper\manifest.json" /f
reg add "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\%HOST_NAME%" /ve /t REG_SZ /d "%APPDATA%\DynamicsHelper\manifest.json" /f

echo.
echo ==========================================
echo   Installation Complete!
echo ==========================================
echo Please restart your browser or reload the extension.
pause

@echo off
echo Launching Dynamics Helper Installer...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer_core.ps1"
if %errorlevel% neq 0 pause

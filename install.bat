@echo off
echo Launching Dynamics Helper Installer...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
if %errorlevel% neq 0 pause

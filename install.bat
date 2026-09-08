@echo off
setlocal
echo Launching Dynamics Helper Installer...
powershell.exe -NoProfile -File "%~dp0installer_core.ps1"
set "InstallerExitCode=%errorlevel%"
if %InstallerExitCode% neq 0 pause
exit /b %InstallerExitCode%

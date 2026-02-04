@echo off
echo Dynamics Helper - Native Host Installer

echo 1. Creating Python Virtual Environment...
python -m venv "%~dp0venv"

echo 2. Installing Dependencies...
:: Currently no external dependencies for the basic host, but good practice
if exist "%~dp0requirements.txt" (
    "%~dp0venv\Scripts\pip.exe" install -r "%~dp0requirements.txt"
)

echo 3. Registering Native Host...
"%~dp0venv\Scripts\python.exe" "%~dp0register.py"

echo.
echo Setup Complete!
pause

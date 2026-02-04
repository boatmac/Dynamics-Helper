@echo off
:: Wrapper script for Dynamics Helper Native Host
:: Ensures we use the local virtual environment Python and unbuffered I/O

:: Use the python executable from the venv subdirectory
"%~dp0venv\Scripts\python.exe" -u "%~dp0dh_native_host.py"

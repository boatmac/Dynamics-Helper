@echo off
:: Wrapper script for Dynamics Helper Native Host
:: Ensures we use the local virtual environment Python and unbuffered I/O

:: Logging startup (for debugging only, goes to file)
echo Starting Host Wrapper at %DATE% %TIME% >> "%USERPROFILE%\dhnativehost_debug.txt"

:: CRITICAL: STDOUT (1) must NOT be redirected, it is the communication pipe to Chrome.
:: We can redirect STDERR (2) to a log file if we want to catch crashes.
"%~dp0venv\Scripts\python.exe" -u "%~dp0dh_native_host.py" 2>> "%USERPROFILE%\dhnativehost_error.log"

:: Note: We can't log exit code easily without breaking the pipe or using a complex wrapper


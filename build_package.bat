REM Build Native Host
cd host
venv\Scripts\pyinstaller --onefile --name dh_native_host dh_native_host.py
copy dist\dh_native_host.exe ..\dist\dh_native_host.exe
copy config.json ..\dist\config.json
copy copilot-instructions.md ..\dist\copilot-instructions.md
copy install_host.bat ..\dist\install_host.bat

REM Build Extension
cd ..\extension
call npm install
call npm run build
xcopy /E /I dist ..\dist\extension

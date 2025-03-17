@echo off
start "" ".\server.bat"
timeout /t 5 >nul
start http://localhost:8000
pause
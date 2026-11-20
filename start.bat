@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_shasthosetu.ps1" %*
endlocal

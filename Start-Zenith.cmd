@echo off
setlocal
title Zenith Journal
cd /d "%~dp0"

echo Starting Zenith from %CD%...
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-Zenith.ps1"
set "ZENITH_EXIT=%ERRORLEVEL%"

if not "%ZENITH_EXIT%"=="0" (
  echo.
  echo Zenith could not start. Copy the error above when asking for help.
  pause
)

exit /b %ZENITH_EXIT%

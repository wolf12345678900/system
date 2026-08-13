@echo off
title THE SYSTEM
cd /d "%~dp0"

set "PY="
where py.exe >nul 2>nul && set "PY=py"
if not defined PY (
  where python.exe >nul 2>nul && set "PY=python"
)

if not defined PY (
  echo.
  echo   Python wurde nicht gefunden.
  echo.
  echo   Installiere es kostenlos von https://www.python.org/downloads/
  echo   Wichtig: beim Installieren "Add Python to PATH" ankreuzen.
  echo.
  pause
  exit /b 1
)

%PY% serve.py
pause

@echo off
cd /d "%~dp0"

where py >nul 2>nul
if %errorlevel%==0 (
    start "AERO // FUEL local server" /D "%~dp0" py -m http.server 8000
) else (
    where python >nul 2>nul
    if %errorlevel%==0 (
        start "AERO // FUEL local server" /D "%~dp0" python -m http.server 8000
    ) else (
        echo Python was not found. Install Python, then run this file again.
        pause
        exit /b 1
    )
)

timeout /t 2 /nobreak >nul
start "" "http://localhost:8000"

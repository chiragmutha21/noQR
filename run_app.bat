@echo off
SETLOCAL EnableDelayedExpansion

echo ======================================================
echo    AR Image Recognition System - Setup ^& Launcher
echo ======================================================

:: 1. Backend Setup
echo [1/4] Checking Backend environment...
CD /D "%~dp0backend"

IF NOT EXIST venv (
    echo [*] Creating Python virtual environment...
    python -m venv venv
)

echo [*] Installing/Updating Backend requirements...
call venv\Scripts\activate
pip install -r requirements.txt

:: 2. Local Network Auto-Configuration
echo.
echo [2/4] Auto-configuring Mobile Network Settings...
CD /D "%~dp0"
python setup_env.py

:: 3. Frontend Setup
echo.
echo [3/4] Checking Frontend environment...
CD /D "%~dp0frontend"

echo [*] Installing/Updating Frontend dependencies...
call npm install

echo [*] Installing/Updating Scanner App dependencies...
CD /D "%~dp0scanner-app"
call npm install

:: 4. Launching Servers
echo.
echo [4/4] Launching Background Servers...
start "Backend Server" cmd /k "CD /D %~dp0backend && venv\Scripts\activate && python main.py"
start "Frontend Dashboard" cmd /k "CD /D %~dp0frontend && npm run dev"
start "Scanner App" cmd /k "CD /D %~dp0scanner-app && npm run dev"

echo.
echo ======================================================
echo    SYSTEM STATUS: Launching...
echo.
echo    IMPORTANT SECURITY NOTICE FOR GOOGLE LOGIN:
echo    If the link changed from last time, you MUST update:
echo    console.cloud.google.com -^> Credentials -^> OAuth 
echo    with the new Mobile Access Link printed above.
echo.
echo    Keep this window open or close it. 
echo    The servers are now running in separate windows.
echo ======================================================

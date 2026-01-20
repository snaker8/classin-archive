@echo off
echo ==========================================
echo    ClassIn Archive Monitor - Setup
echo ==========================================
echo.

:: 1. Check Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please download and install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b
)

echo [OK] Node.js is found.
echo.

:: 2. Initialize and Install Dependencies
if not exist "package.json" (
    echo [INFO] Initializing project...
    call npm init -y >nul 2>&1
)

echo [INFO] Installing required libraries...
call npm install @supabase/supabase-js dotenv

echo.
echo [SUCCESS] Setup complete!
echo You can now run 'run-monitor.bat'.
echo.
pause

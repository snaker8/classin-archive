@echo off
title ClassIn Folder Monitor
echo Auto Upload Program Starting...
cd /d "d:\클래스인 학습자료\classin-archive"

:: Check if node is installed
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed! Please install Node.js first.
    pause
    exit
)

:: Run the monitor script
node scripts/folder-monitor.js

pause

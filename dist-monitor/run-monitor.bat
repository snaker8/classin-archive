@echo off
chcp 65001 > nul
cd /d "%~dp0"
title ClassIn Monitor
echo Starting Monitor...
node folder-monitor.js
pause

@echo off
chcp 65001 >nul
setlocal

:: Get the directory where this script is located
set "BaseDir=%~dp0"
:: Remove trailing backslash if present
if "%BaseDir:~-1%"=="\" set "BaseDir=%BaseDir:~0,-1%"

set "SrcFile=%BaseDir%\Run-Folder-Monitor.bat"
set "StartupDir=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "ShortcutName=ClassIn-Folder-Monitor.lnk"

echo Setting up Auto-Start for ClassIn Monitor...
echo Source: %SrcFile%
echo Target: %StartupDir%

:: Create Shortcut using PowerShell with dynamic paths
powershell "$s=(New-Object -COM WScript.Shell).CreateShortcut('%StartupDir%\%ShortcutName%');$s.TargetPath='%SrcFile%';$s.WorkingDirectory='%BaseDir%';$s.WindowStyle=7;$s.Save()"

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Successfully added to Startup!
    echo.
) else (
    echo.
    echo [ERROR] Failed to create shortcut.
)

pause

@echo off
set "SHORTCUT_NAME=ClassIn Monitor.lnk"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "TARGET_FILE=%~dp0run-monitor.bat"
set "ICON_FILE=%~dp0folder-monitor.js"

echo Installing to Startup folder...
echo Target: %TARGET_FILE%
echo Destination: %STARTUP_DIR%\%SHORTCUT_NAME%

powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%STARTUP_DIR%\%SHORTCUT_NAME%');$s.TargetPath='%TARGET_FILE%';$s.WorkingDirectory='%~dp0';$s.Save()"

if exist "%STARTUP_DIR%\%SHORTCUT_NAME%" (
    echo.
    echo [SUCCESS] Monitor has been added to Windows Startup!
    echo It will now run automatically when the computer turns on.
) else (
    echo.
    echo [ERROR] Failed to create startup shortcut.
)

pause

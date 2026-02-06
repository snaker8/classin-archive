@echo off
chcp 65001 >nul
:: Change to the script's directory to ensure relative paths work
cd /d "%~dp0"

echo Installing to Startup folder...

:: Define temp script path in current folder to avoid permission/path issues in %TEMP%
set "PS_SCRIPT=%~dp0setup_shortcut_temp.ps1"

:: Create PowerShell script to handle shortcut creation robustly
(
echo $ErrorActionPreference = 'Stop'
echo try {
echo     $ws = New-Object -ComObject WScript.Shell
echo     $startup = [Environment]::GetFolderPath^('Startup'^)
echo     $linkPath = Join-Path $startup 'ClassIn Monitor.lnk'
echo     $targetFile = Get-Item '.\start-silent.vbs'
echo     $target = $targetFile.FullName
echo     $workDir = $targetFile.DirectoryName
echo     Write-Host "Target: $target"
echo     Write-Host "Shortcut: $linkPath"
echo     $s = $ws.CreateShortcut^($linkPath^)
echo     $s.TargetPath = $target
echo     $s.WorkingDirectory = $workDir
echo     $s.Save^(\)
echo     exit 0
echo } catch {
echo     Write-Error $_.Exception.Message
echo     exit 1
echo }
) > "%PS_SCRIPT%"

:: Run the PowerShell script
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%"

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Monitor has been added to Windows Startup!
) else (
    echo.
    echo [ERROR] Installation failed.
)

:: Clean up temp file
if exist "%PS_SCRIPT%" del "%PS_SCRIPT%"

pause

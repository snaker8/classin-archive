@echo off
chcp 65001 >nul
:: Change to the script's directory to ensure relative paths work
cd /d "%~dp0"

echo Installing to Startup folder...

:: Define temp script path in system temp folder to avoid path encoding issues
set "PS_SCRIPT=%TEMP%\setup_shortcut_%RANDOM%.ps1"

:: Create PowerShell script to handle shortcut creation robustly
echo $ErrorActionPreference = 'Stop' > "%PS_SCRIPT%"
echo try { >> "%PS_SCRIPT%"
echo     $ws = New-Object -ComObject WScript.Shell >> "%PS_SCRIPT%"
echo     $startup = [Environment]::GetFolderPath('Startup') >> "%PS_SCRIPT%"
echo     $linkPath = Join-Path $startup 'ClassIn Monitor.lnk' >> "%PS_SCRIPT%"
echo     $targetFile = Get-Item '.\start-silent.vbs' >> "%PS_SCRIPT%"
echo     $target = $targetFile.FullName >> "%PS_SCRIPT%"
echo     $workDir = $targetFile.DirectoryName >> "%PS_SCRIPT%"
echo     Write-Host "Target: $target" >> "%PS_SCRIPT%"
echo     Write-Host "Shortcut: $linkPath" >> "%PS_SCRIPT%"
echo     $s = $ws.CreateShortcut($linkPath) >> "%PS_SCRIPT%"
echo     $s.TargetPath = $target >> "%PS_SCRIPT%"
echo     $s.WorkingDirectory = $workDir >> "%PS_SCRIPT%"
echo     $s.Save() >> "%PS_SCRIPT%"
echo     exit 0 >> "%PS_SCRIPT%"
echo } catch { >> "%PS_SCRIPT%"
echo     Write-Error $_.Exception.Message >> "%PS_SCRIPT%"
echo     exit 1 >> "%PS_SCRIPT%"
echo } >> "%PS_SCRIPT%"

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

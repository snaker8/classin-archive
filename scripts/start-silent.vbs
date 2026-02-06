Set WshShell = CreateObject("WScript.Shell")
strPath = WshShell.CurrentDirectory
' Get the script's directory
strScriptDir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
' Run the batch file hidden (0)
WshShell.Run chr(34) & strScriptDir & "run-monitor.bat" & chr(34), 0
Set WshShell = Nothing

Set objShell = CreateObject("WScript.Shell")
objShell.Run "powershell -windowstyle hidden -ExecutionPolicy Bypass -File C:\software\DownloadBingImage.ps1", 0, True


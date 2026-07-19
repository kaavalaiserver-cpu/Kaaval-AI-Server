param(
    [Parameter(Mandatory=$true)]
    [string]$Password
)

$ErrorActionPreference = 'Stop'

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   Kaaval AI - Unattended Auto-Boot Setup" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$username = $env:USERNAME

# Set AutoAdminLogon in Registry
$registryPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
Set-ItemProperty -Path $registryPath -Name "AutoAdminLogon" -Value "1"
Set-ItemProperty -Path $registryPath -Name "DefaultUserName" -Value $username
Set-ItemProperty -Path $registryPath -Name "DefaultPassword" -Value $Password

# Create a startup script that instantly locks the PC when it logs in
$startupFolder = [Environment]::GetFolderPath('Startup')
$lockScriptPath = Join-Path $startupFolder "AutoLock.bat"

"@echo off
:: Wait 15 seconds to let Docker start, then lock the screen
timeout /t 15 /nobreak
rundll32.exe user32.dll,LockWorkStation
" | Out-File -FilePath $lockScriptPath -Encoding ASCII

Write-Host ""
Write-Host "✅ SUCCESS! The server is now fully configured for unattended boots!" -ForegroundColor Green
Write-Host "When the PC turns on, it will quickly log in as Kaaval AI, start Docker, and then immediately lock the screen."
Write-Host "The police can then simply select 'Administrator' on the lock screen and log in to their account while Docker continues running perfectly in the background!"

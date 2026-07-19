param (
    [switch]$SkipPull = $false
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BaseDir = Split-Path -Parent $ScriptDir
Set-Location $BaseDir

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "🚀 FAST LOCAL DEPLOYMENT STARTING 🚀" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

if (-not $SkipPull) {
    Write-Host "`n[1/3] Pulling latest code from GitHub..." -ForegroundColor Yellow
    git pull origin main
} else {
    Write-Host "`n[1/3] Skipping git pull (Local build mode)..." -ForegroundColor Yellow
}

Write-Host "`n[2/3] Building & Deploying Docker Containers..." -ForegroundColor Yellow
# Using standard docker-compose.prod.yml now, no need for project name overrides 
# Using default docker-compose.yml which contains all local environment variables
docker compose up --build -d

Write-Host "`n[3/3] Pruning old untagged Docker images to save space..." -ForegroundColor Yellow
docker image prune -f

Write-Host "`n======================================" -ForegroundColor Green
Write-Host "✅ DEPLOYMENT COMPLETE! ✅" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

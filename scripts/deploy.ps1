param (
    [Parameter(Mandatory=$true)]
    [string]$Tag,

    [Parameter(Mandatory=$true)]
    [string]$Registry,

    [Parameter(Mandatory=$true)]
    [string]$FrontendImage,

    [Parameter(Mandatory=$true)]
    [string]$BackendImage,

    [Parameter(Mandatory=$true)]
    [string]$EvidenceImage
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BaseDir = Split-Path -Parent $ScriptDir
Set-Location $BaseDir

$LogFile = "deploy_log.txt"
Function Log-Message ($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $formatted = "[$timestamp] $msg"
    Write-Host $formatted
    Add-Content -Path $LogFile -Value $formatted
}

$CurrentTagFile = ".current_deploy_tag"
$PreviousTagFile = ".previous_deploy_tag"

$PreviousTag = $null
if (Test-Path $CurrentTagFile) {
    $PreviousTag = Get-Content $CurrentTagFile
    Copy-Item $CurrentTagFile $PreviousTagFile -Force
}

Log-Message "Starting deployment for tag: $Tag"

# Construct Image URLs
$FrontendFull = "$Registry/${FrontendImage}:$Tag"
$BackendFull = "$Registry/${BackendImage}:$Tag"
$EvidenceFull = "$Registry/${EvidenceImage}:$Tag"

$env:FRONTEND_IMAGE = $FrontendFull
$env:BACKEND_IMAGE = $BackendFull
$env:EVIDENCE_IMAGE = $EvidenceFull

if (-not (Test-Path .env)) { New-Item -Path .env -ItemType File -Force | Out-Null }
Log-Message "Pulling images..."
docker compose -f docker-compose.prod.yml pull

$MaxAttempts = 2
$IsHealthy = $false
$HealthCheckUrl = "http://localhost:8003/api/health"
$MaxRetries = 10
$WaitSeconds = 5

for ($Attempt = 1; $Attempt -le $MaxAttempts; $Attempt++) {
    Log-Message "--- Deployment Attempt $Attempt of $MaxAttempts ---"
    
    if ($Attempt -gt 1) {
        Log-Message "::warning::First health check failed! Notifying user. Shutting down containers to retry..."
        docker compose -f docker-compose.prod.yml down
    }

    Log-Message "Deploying new containers..."
    docker compose -f docker-compose.prod.yml up -d

    Log-Message "Waiting 15 seconds for backend to start..."
    Start-Sleep -Seconds 15

    # Healthcheck loop
    for ($i = 1; $i -le $MaxRetries; $i++) {
        Log-Message "Healthcheck poll $i of $MaxRetries..."
        try {
            $response = Invoke-RestMethod -Uri $HealthCheckUrl -Method Get -TimeoutSec 5 -ErrorAction Stop
            Log-Message "Backend is healthy! Response: $($response | ConvertTo-Json -Compress)"
            $IsHealthy = $true
            break
        } catch {
            Log-Message "Healthcheck failed: $($_.Exception.Message)"
            Start-Sleep -Seconds $WaitSeconds
        }
    }
    
    if ($IsHealthy) {
        break
    }
}

if ($IsHealthy) {
    Log-Message "Deployment SUCCESSFUL for tag $Tag."
    Set-Content -Path $CurrentTagFile -Value $Tag
} else {
    Log-Message "::error::Deployment FAILED after $MaxAttempts attempts. Backend did not become healthy."
    if ($PreviousTag) {
        Log-Message "Rolling back to previous tag: $PreviousTag"
        $env:FRONTEND_IMAGE = "$Registry/${FrontendImage}:$PreviousTag"
        $env:BACKEND_IMAGE = "$Registry/${BackendImage}:$PreviousTag"
        $env:EVIDENCE_IMAGE = "$Registry/${EvidenceImage}:$PreviousTag"
        
        docker compose -f docker-compose.prod.yml up -d
        Log-Message "Rollback complete."
        exit 1 # Fail the GH Action
    } else {
        Log-Message "No previous tag found to roll back to! System may be offline."
        exit 1
    }
}

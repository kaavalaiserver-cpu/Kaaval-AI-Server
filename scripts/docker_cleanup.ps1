# Kaaval AI - Docker Weekly Cleanup Script
# This script should be run via Windows Task Scheduler every week to reclaim disk space.

$ErrorActionPreference = 'Stop'
$LogFile = "C:\docker_cleanup_log.txt"

Function Log-Message ($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $formatted = "[$timestamp] $msg"
    Write-Host $formatted
    Add-Content -Path $LogFile -Value $formatted
}

Log-Message "Starting weekly Docker cleanup..."

try {
    # Prune all stopped containers, unused networks, dangling images, and unused volumes
    # The -a flag also removes images that do not have at least one container associated with them
    # The -f flag forces the prune without prompting for confirmation
    $output = docker system prune -af --volumes 2>&1
    
    foreach ($line in $output) {
        Log-Message $line
    }
    
    Log-Message "Cleanup completed successfully."
} catch {
    Log-Message "Error during cleanup: $($_.Exception.Message)"
    exit 1
}

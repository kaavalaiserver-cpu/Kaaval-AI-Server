@echo off
echo ===================================================
echo      STOPPING KAAVAL AI SERVICES
echo ===================================================

echo Stopping Admin Dashboard (Port 3000)...
FOR /F "tokens=5" %%T IN ('netstat -aon ^| findstr :3000') DO taskkill /F /PID %%T >nul 2>&1

echo Stopping Evidence API (Port 8001)...
FOR /F "tokens=5" %%T IN ('netstat -aon ^| findstr :8001') DO taskkill /F /PID %%T >nul 2>&1

echo Stopping Backend API (Port 8003)...
FOR /F "tokens=5" %%T IN ('netstat -aon ^| findstr :8003') DO taskkill /F /PID %%T >nul 2>&1

echo All Kaaval AI services have been stopped successfully!
pause

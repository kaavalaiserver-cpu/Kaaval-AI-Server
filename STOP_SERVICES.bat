@echo off
echo Stopping all Kaaval AI Services...

echo [1/5] Kill Backend (Port 8003)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8003" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo [2/5] Kill Dashboard (Port 3000)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo [3/5] Kill Evidence API (Port 8001)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8001" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo [4/5] Cleanup Node processes...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo All services stopped. Port locks released.
pause
@echo off
echo Stopping all Kaaval AI Services...

echo [1/4] Kill Backend (Port 8003)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8003" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo [2/4] Kill Dashboard (Port 3000)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo [3/4] Cleanup Node processes...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo All services stopped. Port locks released.
pause
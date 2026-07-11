@echo off
title Kaaval AI Launcher
echo ===================================================
echo       KAAVAL AI - LOCAL DEVELOPMENT ENVIRONMENT
echo ===================================================
echo.

echo [1/3] Starting Backend API (Port 8003)...
start "Kaaval Backend" cmd /k "cd /d "admin dashboard\kaaval-backend" && npm run start:dev"

echo Waiting for Backend to initialize...
set "BACKEND_READY=0"
for /l %%i in (1,1,40) do (
	netstat -aon | find ":8003" | find "LISTENING" >nul
	if not errorlevel 1 (
		set "BACKEND_READY=1"
		goto :backend_ready
	)
	timeout /t 1 /nobreak >nul
)

:backend_ready
if "%BACKEND_READY%"=="1" (
	echo Backend is up on port 8003.
) else (
	echo WARNING: Backend not confirmed on port 8003 after 40 seconds. Continuing startup...
)

echo [2/3] Starting Admin Dashboard (Port 3000)...
start "Kaaval Dashboard" cmd /k "cd /d "admin dashboard\kaaval_dashboard" && npm run dev"

echo [3/3] Starting Evidence API (Port 8001)...
start "Kaaval Evidence API" cmd /k "cd /d "kaaval_api" && uvicorn main:app --port 8001 --reload"

echo.
echo ===================================================
echo SYSTEM STARTUP INITIATED
echo ===================================================
echo.
echo Backend API:     http://localhost:8003
echo Evidence API:    http://localhost:8001
echo Admin Dashboard: http://localhost:3000
echo.
echo ===================================================
echo              LOGIN CREDENTIALS
echo ===================================================
echo.
echo  SUPERADMIN LOGIN:
echo    Username: superadmin
echo    Password: Kk@7200599700
echo.
echo  DEVELOPER LOGIN:
echo    Username: developer
echo    Password: kaaval@123
echo.
echo  * Note: All mock test users have been permanently 
echo          removed for production security.
echo.
echo ===================================================
echo            LOCAL STORAGE CONFIGURED
echo ===================================================
echo   Images and evidence are stored locally in the 
echo   uploads directory. Ensure Docker volumes are 
echo   configured properly for the production server.
echo ===================================================
echo.
pause
echo.
echo ===================================================
echo             ALL SERVICES RUNNING
echo ===================================================
echo Backend API:      http://localhost:8003
echo Evidence API:     http://localhost:8001
echo Admin Dashboard:  http://localhost:3000
echo.
echo Opening Dashboard in 5 seconds...
timeout /t 5 /nobreak >nul
start http://localhost:3000
echo.
echo.
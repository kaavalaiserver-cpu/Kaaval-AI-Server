@echo off
title Kaaval AI Launcher
echo ===================================================
echo       KAAVAL AI - INTEGRATED SECURITY SYSTEM
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

echo [2/2] Starting Admin Dashboard (Port 3000)...
start "Kaaval Dashboard" cmd /k "cd /d "admin dashboard\kaaval_dashboard" && npm run dev"

echo.
echo ===================================================
echo SYSTEM STARTUP INITIATED
echo ===================================================
echo.
echo Backend API:     http://localhost:8003
echo Admin Dashboard: http://localhost:3000
echo.
echo ===================================================
echo              LOGIN CREDENTIALS
echo ===================================================
echo.
echo  SUPERADMIN LOGIN:
echo    Username: superadmin
echo    Password: superadmin@123
echo.
echo  TRAFFIC ADMIN LOGIN:
echo    Username: trafficadmin
echo    Password: trafficadmin@123
echo.
echo  DEV ADMIN LOGIN:
echo    Username: devadmin
echo    Password: devadmin@123
echo.
echo  SUBDIVISION ADMINS:
echo    1. colacheladmin        ^| colachel@123
echo    2. marthandamadmin      ^| marthandam@123
echo    3. nagercoiladmin       ^| nagercoil@123
echo    4. kanyakumariadmin     ^| kanyakumari@123
echo    5. thuckalayadmin       ^| thuckalay@123
echo.
echo ===================================================
echo         AWS S3 IMAGE STORAGE CONFIGURED
echo ===================================================
echo   Images are stored in AWS S3 Bucket
echo   Ensure .env has valid AWS credentials:
echo    * AWS_ACCESS_KEY_ID
echo    * AWS_SECRET_ACCESS_KEY
echo    * S3_BUCKET_NAME
echo ===================================================
echo.
pause
echo.
echo ===================================================
echo             ALL SERVICES RUNNING
echo ===================================================
echo Backend API:      http://localhost:8003
echo Admin Dashboard:  http://localhost:3000
echo.
echo Opening Dashboard in 5 seconds...
timeout /t 5 /nobreak >nul
start http://localhost:3000
echo.
echo.  
@echo off
title Kaaval AI - Startup
color 0B
echo.
echo  ============================================================
echo   _  __    _     ___   __     ___    _        ___    ___
echo   ^| ^|/ /   / \   / _ \  \ \   / / \  ^| ^|      / _ \  ^|_ _^|
echo   ^| ' /   / _ \ ^| ^|_^| ^|  \ \ / / _ \ ^| ^|     ^| ^|_^| ^|  ^| ^|
echo   ^| . \  / ___ \^|  _  ^|   \ V / ___ \^| ^|___  ^|  _  ^|  ^| ^|
echo   ^|_^|\_\/_/   \_\_^| ^|_^|    \_/_/   \_\_____^| ^|_^| ^|_^| ^|___^|
echo.
echo  ============================================================
echo   KAAVAL AI — Traffic Violation and Admin Dashboard
echo  ============================================================
echo.

:: Get the directory where this .bat file resides
set "ROOT=%~dp0"

:: Check if node_modules exist for Backend
if not exist "%ROOT%kaaval-backend\node_modules" (
    echo  [!] Backend dependencies not installed. Running npm install...
    cd /d "%ROOT%kaaval-backend" && npm install
    echo.
)
if not exist "%ROOT%kaaval_dashboard\node_modules" (
    echo  [!] Frontend dependencies not installed. Running npm install...
    cd /d "%ROOT%kaaval_dashboard" && npm install
    echo.
)

echo  [1/2] Starting Backend ^(NestJS — port 8003, S3 Image Storage^)...
start "Kaaval Backend" cmd /k "cd /d "%ROOT%kaaval-backend" && npm run start:dev"

timeout /t 4 /nobreak >nul

echo  [2/2] Starting Frontend ^(Vite — port 3000^)...
start "Kaaval Dashboard" cmd /k "cd /d "%ROOT%kaaval_dashboard" && npm run dev"

echo.
echo  ============================================================
echo   Both servers are starting up...
echo  ============================================================
echo.
echo   Backend API  : http://localhost:8003/api
echo   Dashboard    : http://localhost:3000
echo   Image Store  : AWS S3 Bucket
echo.
echo  ------------------------------------------------------------
echo   Login Credentials:
echo  ------------------------------------------------------------
echo   Username        Password            Role
echo   superadmin      superadmin@123      Super Admin
echo   trafficadmin    trafficadmin@123    Traffic Admin
echo   devadmin        devadmin@123        Dev Admin
echo   colacheladmin   colachel@123        Colachel Subdivision
echo   marthandamadmin marthandam@123      Marthandam Subdivision
echo   nagercoiladmin  nagercoil@123       Nagercoil Subdivision
echo   kanyakumariadmin kanyakumari@123    Kanyakumari Subdivision
echo   thuckalayadmin  thuckalay@123       Thuckalay Subdivision
echo  ------------------------------------------------------------
echo.
echo  Opening browser in 5 seconds...
timeout /t 5 /nobreak >nul
start http://localhost:3000
echo.
echo  ============================================================
echo   AWS S3 IMAGE STORAGE CONFIGURATION
echo  ============================================================
echo   Images are stored in AWS S3 Bucket
echo   Ensure environment variables are set in backend .env:
echo     * AWS_ACCESS_KEY_ID
echo     * AWS_SECRET_ACCESS_KEY
echo     * S3_BUCKET_NAME
echo     * AWS_REGION (default: ap-south-1)
echo  ============================================================
echo.
echo  Press any key to close this window (servers will keep running)...
pause >nul

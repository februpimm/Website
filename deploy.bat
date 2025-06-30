@echo off
setlocal enabledelayedexpansion

echo 🚀 LogGuard Deployment for Windows
echo ==================================

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

REM Get domain from environment or user input
if "%DOMAIN%"=="" (
    set /p DOMAIN="Enter your domain name (or press Enter for localhost): "
    if "%DOMAIN%"=="" set DOMAIN=localhost
)

echo 📋 Configuration:
echo    Domain: %DOMAIN%
echo    Environment: production
echo    Port: 8000

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

REM Install PM2 globally if not installed
pm2 --version >nul 2>&1
if errorlevel 1 (
    echo 📦 Installing PM2...
    call npm install -g pm2
)

REM Create logs directory if it doesn't exist
if not exist logs mkdir logs

REM Stop existing PM2 processes
echo 🛑 Stopping existing processes...
pm2 stop logguard-website 2>nul
pm2 delete logguard-website 2>nul

REM Set environment variables
set NODE_ENV=production
set DOMAIN=%DOMAIN%
set PORT=8000
set HOST=0.0.0.0

REM Start the application with PM2
echo 🚀 Starting application with PM2...
call pm2 start ecosystem.config.js --env production

REM Save PM2 configuration
call pm2 save

REM Setup PM2 startup script
call pm2 startup

echo ✅ Deployment completed successfully!
echo.
echo 📊 Application Status:
call pm2 status
echo.
echo 🌐 Your application should be accessible at:
if "%DOMAIN%"=="localhost" (
    echo    http://localhost:8000
    echo    http://127.0.0.1:8000
) else (
    echo    http://%DOMAIN%:8000
    echo    https://%DOMAIN%:8000 (if SSL is configured)
)
echo.
echo 📝 Useful commands:
echo    pm2 logs logguard-website    # View logs
echo    pm2 restart logguard-website # Restart application
echo    pm2 stop logguard-website    # Stop application
echo    pm2 delete logguard-website  # Remove application
echo.
echo 🔧 To configure SSL/HTTPS, you can use:
echo    - Cloudflare for SSL (recommended)
echo    - Let's Encrypt with Certbot
echo    - Nginx as reverse proxy
echo.
echo 🎉 Your LogGuard application is now running!

pause 
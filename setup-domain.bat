@echo off
setlocal enabledelayedexpansion

echo 🌐 LogGuard Domain Setup
echo ========================

REM Get domain from user
set /p DOMAIN="Enter your domain name (e.g., example.com): "
if "%DOMAIN%"=="" (
    echo ❌ Domain name is required
    exit /b 1
)

REM Get IP address (using PowerShell)
for /f "tokens=*" %%i in ('powershell -command "(Invoke-WebRequest -Uri 'https://ifconfig.me' -UseBasicParsing).Content"') do set IP_ADDRESS=%%i
echo 📡 Your public IP address: %IP_ADDRESS%

echo.
echo 📋 Setup Instructions:
echo ======================
echo 1. Point your domain DNS to this IP address:
echo    A record: %DOMAIN% -^> %IP_ADDRESS%
echo    A record: www.%DOMAIN% -^> %IP_ADDRESS%
echo.
echo 2. Wait for DNS propagation (usually 5-30 minutes)
echo.

REM Update configuration files
echo 🔧 Updating configuration files...

REM Update ecosystem.config.js
powershell -command "(Get-Content ecosystem.config.js) -replace 'yourdomain.com', '%DOMAIN%' | Set-Content ecosystem.config.js"

REM Update nginx.conf
powershell -command "(Get-Content nginx.conf) -replace 'yourdomain.com', '%DOMAIN%' | Set-Content nginx.conf"

REM Update server.js
powershell -command "(Get-Content server.js) -replace 'yourdomain.com', '%DOMAIN%' | Set-Content server.js"

REM Create .env file
echo # LogGuard Environment Configuration > .env
echo NODE_ENV=production >> .env
echo PORT=8000 >> .env
echo HOST=0.0.0.0 >> .env
echo DOMAIN=%DOMAIN% >> .env
echo JWT_SECRET=%RANDOM%%RANDOM%%RANDOM%%RANDOM% >> .env
echo SESSION_SECRET=%RANDOM%%RANDOM%%RANDOM%%RANDOM% >> .env
echo LOG_LEVEL=info >> .env
echo LOG_FILE=./logs/app.log >> .env
echo RATE_LIMIT_WINDOW=15 >> .env
echo RATE_LIMIT_MAX_REQUESTS=100 >> .env

echo ✅ Configuration files updated!
echo.

REM SSL setup options
echo 🔒 SSL/HTTPS Setup Options:
echo 1. Cloudflare (Recommended - Free SSL proxy)
echo 2. Self-signed certificate (Development only)
echo 3. Skip SSL setup for now
echo.

set /p SSL_OPTION="Choose SSL option (1-3): "

if "%SSL_OPTION%"=="1" (
    echo ☁️  Cloudflare SSL Setup:
    echo 1. Go to cloudflare.com and add your domain
    echo 2. Update your domain's nameservers to Cloudflare's
    echo 3. Add DNS records:
    echo    A: %DOMAIN% -^> %IP_ADDRESS%
    echo    A: www.%DOMAIN% -^> %IP_ADDRESS%
    echo 4. Enable 'Always Use HTTPS' in Cloudflare settings
    echo 5. Set SSL/TLS encryption mode to 'Full'
    echo.
    echo ✅ Cloudflare SSL will be handled automatically
) else if "%SSL_OPTION%"=="2" (
    echo 🔐 Creating self-signed certificate...
    if not exist ssl mkdir ssl
    
    REM Note: Windows doesn't have openssl by default
    echo ⚠️  Note: You'll need to install OpenSSL for Windows or use Cloudflare SSL
    echo    For now, SSL setup is skipped
) else if "%SSL_OPTION%"=="3" (
    echo ⏭️  Skipping SSL setup
) else (
    echo ❌ Invalid option
    exit /b 1
)

echo.
echo 🚀 Ready to deploy!
echo ==================
echo Run the following command to deploy:
echo.
echo   npm run deploy
echo.
echo Or with Docker:
echo   docker-compose up -d
echo.
echo 🌐 Your application will be available at:
if "%SSL_OPTION%"=="1" (
    echo    https://%DOMAIN%
    echo    https://www.%DOMAIN%
) else (
    echo    http://%DOMAIN%:8000
    echo    http://www.%DOMAIN%:8000
)
echo.
echo 📊 Health check:
echo    https://%DOMAIN%/health
echo.
echo ✅ Domain setup completed!

pause 
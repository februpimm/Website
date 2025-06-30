#!/bin/bash

# LogGuard Deployment Script
# ใช้สำหรับ deploy เว็บไซต์ไปยัง custom domain

set -e

echo "🚀 Starting LogGuard Deployment..."

# Configuration
DOMAIN=${1:-"yourdomain.com"}
NODE_ENV=${2:-"production"}
PORT=${3:-8000}

echo "📋 Configuration:"
echo "   Domain: $DOMAIN"
echo "   Environment: $NODE_ENV"
echo "   Port: $PORT"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Stop existing PM2 processes
echo "🛑 Stopping existing processes..."
pm2 stop logguard-website 2>/dev/null || true
pm2 delete logguard-website 2>/dev/null || true

# Set environment variables
export NODE_ENV=$NODE_ENV
export DOMAIN=$DOMAIN
export PORT=$PORT
export HOST="0.0.0.0"

# Start the application with PM2
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup

echo "✅ Deployment completed successfully!"
echo ""
echo "📊 Application Status:"
pm2 status
echo ""
echo "🌐 Your application should be accessible at:"
echo "   http://$DOMAIN:$PORT"
echo "   https://$DOMAIN:$PORT (if SSL is configured)"
echo ""
echo "📝 Useful commands:"
echo "   pm2 logs logguard-website    # View logs"
echo "   pm2 restart logguard-website # Restart application"
echo "   pm2 stop logguard-website    # Stop application"
echo "   pm2 delete logguard-website  # Remove application"
echo ""
echo "🔧 To configure SSL/HTTPS, you can use:"
echo "   - Let's Encrypt with Certbot"
echo "   - Nginx as reverse proxy"
echo "   - Cloudflare for SSL" 
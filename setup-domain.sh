#!/bin/bash

# LogGuard Domain Setup Script
# ใช้สำหรับตั้งค่า domain และ SSL

set -e

echo "🌐 LogGuard Domain Setup"
echo "========================"

# Get domain from user
read -p "Enter your domain name (e.g., example.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    echo "❌ Domain name is required"
    exit 1
fi

# Get IP address
IP_ADDRESS=$(curl -s ifconfig.me)
echo "📡 Your public IP address: $IP_ADDRESS"

echo ""
echo "📋 Setup Instructions:"
echo "======================"
echo "1. Point your domain DNS to this IP address:"
echo "   A record: $DOMAIN -> $IP_ADDRESS"
echo "   A record: www.$DOMAIN -> $IP_ADDRESS"
echo ""
echo "2. Wait for DNS propagation (usually 5-30 minutes)"
echo ""

# Update configuration files
echo "🔧 Updating configuration files..."

# Update ecosystem.config.js
sed -i "s/yourdomain.com/$DOMAIN/g" ecosystem.config.js

# Update nginx.conf
sed -i "s/yourdomain.com/$DOMAIN/g" nginx.conf

# Update server.js
sed -i "s/yourdomain.com/$DOMAIN/g" server.js

# Create .env file
cat > .env << EOF
# LogGuard Environment Configuration
NODE_ENV=production
PORT=8000
HOST=0.0.0.0
DOMAIN=$DOMAIN
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
LOG_LEVEL=info
LOG_FILE=./logs/app.log
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
EOF

echo "✅ Configuration files updated!"
echo ""

# SSL setup options
echo "🔒 SSL/HTTPS Setup Options:"
echo "1. Let's Encrypt (Recommended - Free)"
echo "2. Cloudflare (Free SSL proxy)"
echo "3. Self-signed certificate (Development only)"
echo "4. Skip SSL setup for now"
echo ""

read -p "Choose SSL option (1-4): " SSL_OPTION

case $SSL_OPTION in
    1)
        echo "🔐 Setting up Let's Encrypt SSL..."
        
        # Check if certbot is installed
        if ! command -v certbot &> /dev/null; then
            echo "📦 Installing Certbot..."
            if command -v apt &> /dev/null; then
                sudo apt update
                sudo apt install -y certbot
            elif command -v yum &> /dev/null; then
                sudo yum install -y certbot
            else
                echo "❌ Package manager not found. Please install Certbot manually."
                exit 1
            fi
        fi
        
        # Create SSL directory
        mkdir -p ssl
        
        echo "🎫 Getting SSL certificate from Let's Encrypt..."
        sudo certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
        
        # Copy certificates
        sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ssl/cert.pem
        sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ssl/key.pem
        sudo chown $USER:$USER ssl/cert.pem ssl/key.pem
        
        echo "✅ SSL certificate installed!"
        echo "🔄 Certificate will auto-renew every 60 days"
        ;;
        
    2)
        echo "☁️  Cloudflare SSL Setup:"
        echo "1. Go to cloudflare.com and add your domain"
        echo "2. Update your domain's nameservers to Cloudflare's"
        echo "3. Add DNS records:"
        echo "   A: $DOMAIN -> $IP_ADDRESS"
        echo "   A: www.$DOMAIN -> $IP_ADDRESS"
        echo "4. Enable 'Always Use HTTPS' in Cloudflare settings"
        echo "5. Set SSL/TLS encryption mode to 'Full'"
        echo ""
        echo "✅ Cloudflare SSL will be handled automatically"
        ;;
        
    3)
        echo "🔐 Creating self-signed certificate..."
        mkdir -p ssl
        
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ssl/key.pem -out ssl/cert.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"
            
        echo "✅ Self-signed certificate created!"
        echo "⚠️  Note: Browsers will show security warning for self-signed certificates"
        ;;
        
    4)
        echo "⏭️  Skipping SSL setup"
        ;;
        
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "🚀 Ready to deploy!"
echo "=================="
echo "Run the following command to deploy:"
echo ""
echo "  ./deploy.sh $DOMAIN"
echo ""
echo "Or with Docker:"
echo "  docker-compose up -d"
echo ""
echo "🌐 Your application will be available at:"
if [ "$SSL_OPTION" != "4" ]; then
    echo "   https://$DOMAIN"
    echo "   https://www.$DOMAIN"
else
    echo "   http://$DOMAIN:8000"
    echo "   http://www.$DOMAIN:8000"
fi
echo ""
echo "📊 Health check:"
echo "   https://$DOMAIN/health"
echo ""
echo "✅ Domain setup completed!" 
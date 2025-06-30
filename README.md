# LogLens - Advanced Log Analysis & Security Monitoring

A smart layer of defense for your NGINX logs with AI-powered anomaly detection and real-time security monitoring.

## 🌟 Features

- **Real-time Log Monitoring** - Monitor your logs in real-time with advanced analytics
- **AI-Powered Analysis** - Machine learning algorithms to identify patterns and threats
- **Automated Alerts** - Instant notifications for suspicious activities
- **Comprehensive Dashboard** - Beautiful and intuitive user interface
- **Chat Assistant** - AI-powered chat for log analysis help
- **Multi-user Support** - User authentication and management

## 📁 Project Structure

```
LogLens/
├── Chatbot/                 # AI Chat Assistant
│   ├── backend.py          # Chatbot backend
│   ├── requirements.txt    # Python dependencies
│   └── public/            # Frontend files
├── LogLensApp/            # Main Log Analysis Application
│   ├── app.py             # Flask application
│   ├── predictor.py       # ML prediction model
│   ├── static/           # CSS/JS files
│   └── templates/        # HTML templates
├── TrainModel/           # Machine Learning Training
│   ├── *.ipynb          # Jupyter notebooks for training
│   └── catboost_model.joblib  # Trained model
├── WebDesign/            # Frontend Design
│   └── FrontEnd/        # HTML/CSS/JS files
├── database/            # Database files
├── Website/             # Main Website (This folder)
│   ├── web/            # Frontend files
│   ├── server.js       # Express server
│   ├── package.json    # Node.js dependencies
│   └── deploy.sh       # Deployment script
└── README.md           # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 14+ 
- Python 3.8+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/HooangF4t/LogLens.git
cd LogLens/Website
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the application**

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run prod
```

## 🌐 Deployment Options

### 1. GitHub Pages (Free)
```bash
# Push to GitHub
git add .
git commit -m "Update LogLens website"
git push origin main

# Enable GitHub Pages in repository settings
# Go to Settings > Pages > Source: Deploy from a branch
```

### 2. Netlify (Free)
1. Go to [netlify.com](https://netlify.com)
2. Connect your GitHub repository
3. Deploy automatically

### 3. Vercel (Free)
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Deploy automatically

### 4. Custom Domain Deployment

**Using the deployment script:**
```bash
# Windows
deploy.bat

# Linux/Mac
chmod +x deploy.sh
./deploy.sh yourdomain.com
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `8000` |
| `HOST` | Server host | `0.0.0.0` |
| `DOMAIN` | Your domain name | `yourdomain.com` |

### SSL/HTTPS Setup

#### Option 1: Cloudflare (Recommended)
1. Add your domain to Cloudflare
2. Set DNS records to point to your server
3. Enable "Always Use HTTPS"

#### Option 2: Let's Encrypt
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com
```

## 📊 API Endpoints

- `POST /api/login` - User authentication
- `POST /api/register` - User registration
- `GET /api/dashboard-data` - Dashboard statistics
- `GET /health` - Health check

## 🛠️ Development

### Adding New Features

1. **Backend**: Add routes in `server.js`
2. **Frontend**: Update HTML/CSS/JS in `web/` directory
3. **Testing**: Test locally with `npm run dev`

## 🚨 Troubleshooting

### Common Issues

1. **Port already in use**
```bash
# Find process using port 8000
lsof -i :8000
# Kill the process
kill -9 <PID>
```

2. **Permission denied**
```bash
# Fix file permissions
chmod +x deploy.sh
chmod 755 logs/
```

### Logs

Check application logs:
```bash
# PM2 logs
pm2 logs logguard-website

# Direct logs
tail -f logs/combined.log
```

## 📞 Support

For issues and questions:
- Check the logs in `logs/` directory
- Review the health endpoint: `https://yourdomain.com/health`
- Ensure all environment variables are set correctly

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👥 Contributors

- **HooangF4t** - *Initial work* - [HooangF4t](https://github.com/HooangF4t)
- **pexa8335** - *Phan Duc Anh* - [pexa8335](https://github.com/pexa8335)

---

**Made with ❤️ for better log security** 
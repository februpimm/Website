# 🚀 How to Update LogLens GitHub Repository

## 📋 Steps to Update Your GitHub Repository

### 1. Initialize Git (if not already done)
```bash
git init
git remote add origin https://github.com/HooangF4t/LogLens.git
```

### 2. Add Your Changes
```bash
# Add all files
git add .

# Or add specific files
git add README.md
git add web/
git add server.js
git add package.json
git add deploy.sh
git add deploy.bat
git add setup-domain.bat
git add ecosystem.config.js
git add docker-compose.yml
git add nginx.conf
git add env.example
```

### 3. Commit Your Changes
```bash
git commit -m "Update LogLens website with new features and deployment scripts

- Added Express.js server with authentication
- Added modern UI with dashboard and chat features
- Added deployment scripts for Windows and Linux
- Added Docker support
- Added Nginx configuration for SSL
- Updated README with comprehensive documentation
- Added environment configuration examples"
```

### 4. Push to GitHub
```bash
# If this is your first push
git push -u origin main

# For subsequent pushes
git push origin main
```

## 🌐 Enable GitHub Pages

1. Go to your repository: https://github.com/HooangF4t/LogLens
2. Click on "Settings"
3. Scroll down to "Pages" in the left sidebar
4. Under "Source", select "Deploy from a branch"
5. Choose "main" branch
6. Select "/ (root)" folder
7. Click "Save"

Your website will be available at: `https://hooangf4t.github.io/LogLens/`

## 🔧 Alternative: Deploy to Netlify

1. Go to [netlify.com](https://netlify.com)
2. Sign up/Login with GitHub
3. Click "New site from Git"
4. Choose GitHub and select your LogLens repository
5. Set build command: `npm install`
6. Set publish directory: `web/`
7. Click "Deploy site"

## 📁 File Structure to Upload

```
LogLens/
├── Website/                    # New folder for the website
│   ├── web/                   # Frontend files
│   │   ├── standalone.html    # Main application
│   │   ├── dashboard.html     # Dashboard page
│   │   ├── chat.html         # Chat interface
│   │   ├── style.css         # Styles
│   │   └── script.js         # JavaScript
│   ├── server.js             # Express server
│   ├── package.json          # Dependencies
│   ├── ecosystem.config.js   # PM2 configuration
│   ├── docker-compose.yml    # Docker setup
│   ├── nginx.conf           # Nginx configuration
│   ├── deploy.sh            # Linux deployment script
│   ├── deploy.bat           # Windows deployment script
│   ├── setup-domain.bat     # Domain setup for Windows
│   ├── env.example          # Environment variables example
│   └── logs/                # Application logs
├── Chatbot/                 # Existing AI Chat Assistant
├── LogLensApp/             # Existing Log Analysis Application
├── TrainModel/             # Existing ML Training
├── WebDesign/              # Existing Frontend Design
├── database/               # Existing database files
└── README.md               # Updated README
```

## 🎯 Quick Commands

### For Windows:
```bash
# Add all changes
git add .

# Commit with message
git commit -m "Update LogLens website with deployment features"

# Push to GitHub
git push origin main
```

### For Linux/Mac:
```bash
# Add all changes
git add .

# Commit with message
git commit -m "Update LogLens website with deployment features"

# Push to GitHub
git push origin main
```

## 🔍 Verify Your Update

1. Go to https://github.com/HooangF4t/LogLens
2. Check that your files are uploaded
3. If you enabled GitHub Pages, check: https://hooangf4t.github.io/LogLens/

## 🚨 Troubleshooting

### If you get permission errors:
```bash
# Check your git configuration
git config --list

# Set your username and email
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### If you need to force push (be careful!):
```bash
git push --force origin main
```

### If you need to pull latest changes first:
```bash
git pull origin main
```

## 📞 Need Help?

- Check GitHub documentation: https://docs.github.com/
- Check Git documentation: https://git-scm.com/doc
- Create an issue in the repository if you need help

---

**Happy coding! 🚀** 
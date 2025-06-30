const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet'); // เพิ่ม security headers

const app = express();

// Environment variables สำหรับ deployment
const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || '0.0.0.0';
const DOMAIN = process.env.DOMAIN || 'yourdomain.com'; // เปลี่ยนเป็น domain ของคุณ
const NODE_ENV = process.env.NODE_ENV || 'development';

// Path ไปยังไฟล์ users.json
const USERS_FILE = path.join(__dirname, 'users.json');

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:", "https://cdn.jsdelivr.net"],
            connectSrc: ["'self'"]
        }
    }
}));

// Helper function เพื่ออ่านข้อมูลผู้ใช้จากไฟล์ users.json
const readUsers = () => {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading users file, initializing as empty array:', error.message);
        return [];
    }
};

// Helper function เพื่อเขียนข้อมูลผู้ใช้ลงในไฟล์ users.json
const writeUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
};

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// CORS configuration สำหรับ production
const corsOptions = {
    origin: NODE_ENV === 'production' 
        ? [
            `https://${DOMAIN}`,
            `https://www.${DOMAIN}`,
            `http://${DOMAIN}`,
            `http://www.${DOMAIN}`
          ]
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Trust proxy สำหรับ production (ถ้าใช้ reverse proxy)
if (NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// กำหนดให้ Express Serve ไฟล์ Static
app.use(express.static(path.join(__dirname, 'web')));

// Route สำหรับ root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'standalone.html'));
});

// Route สำหรับ standalone page
app.get('/standalone', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'standalone.html'));
});

// Route สำหรับ dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'dashboard.html'));
});

// Route สำหรับ chat
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'chat.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        domain: DOMAIN
    });
});

// ********** API Endpoints **********

// API สำหรับ Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    console.log(`[API] Login attempt for email: ${email}`);

    const users = readUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        console.log('[API] Login success for', email);
        res.status(200).json({ 
            message: "Login successful!", 
            token: "dummy-jwt-token-abc123",
            user: { email: user.email, username: user.username }
        });
    } else {
        console.log('[API] Login failed for', email);
        res.status(401).json({ message: "Invalid email or password." });
    }
});

// API สำหรับ Register
app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;
    console.log(`Registering new user: Username: ${username}, Email: ${email}`);

    const users = readUsers();

    // ตรวจสอบว่าอีเมลซ้ำหรือไม่
    if (users.some(u => u.email === email)) {
        return res.status(409).json({ message: "Email already registered." });
    }

    const newUser = { username, email, password };
    users.push(newUser);
    writeUsers(users);

    res.status(201).json({ message: "Registration successful!" });
});

// API สำหรับ dashboard data
app.get('/api/dashboard-data', (req, res) => {
    // Simulate dashboard data
    const dashboardData = {
        totalRequests: Math.floor(Math.random() * 5000) + 1000,
        anomaliesDetected: Math.floor(Math.random() * 500) + 50,
        warnings: Math.floor(Math.random() * 10) + 1,
        systemHealth: Math.random() > 0.7 ? 'Critical' : 'Good',
        recentAnomalies: [
            {
                time: new Date().toISOString(),
                ip: '192.168.1.100',
                request: '/api/data',
                status: '200',
                severity: 'Low'
            }
        ]
    };
    
    res.json(dashboardData);
});

// ********** End API Endpoints **********

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, HOST, () => {
    console.log(`🚀 Server is running on ${HOST}:${PORT}`);
    console.log(`🌍 Environment: ${NODE_ENV}`);
    if (NODE_ENV === 'production') {
        console.log(`🌐 Production server ready!`);
        console.log(`🔗 Access your app at: https://${DOMAIN}`);
    } else {
        console.log(`🔧 Development server ready!`);
        console.log(`📱 Local access: http://localhost:${PORT}`);
        console.log(`🌐 Network access: http://${HOST}:${PORT}`);
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});
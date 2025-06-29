const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // ตรวจสอบว่ามีการเรียกใช้ module 'cors' อย่างถูกต้อง
const path = require('path');
const fs = require('fs'); // เพิ่ม module สำหรับ File System

const app = express();
const port = 8000; // หรือพอร์ตที่คุณต้องการ หากเปลี่ยนเป็น 8000 ต้องอัปเดต URL ใน main.js ด้วย (ในตัวอย่างจะใช้ 3000)

// Path ไปยังไฟล์ users.json
const USERS_FILE = path.join(__dirname, 'users.json');

// Helper function เพื่ออ่านข้อมูลผู้ใช้จากไฟล์ users.json
const readUsers = () => {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // ถ้าไฟล์ไม่มีอยู่ หรือมีปัญหาในการอ่าน/parse ก็คืนค่า array เปล่า
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
app.use(cors());

// กำหนดให้ Express Serve ไฟล์ Static (CSS, JS, รูปภาพ ฯลฯ) จากโฟลเดอร์ 'web'
// นี่คือส่วนสำคัญที่แก้ไขปัญหา ENOENT และการโหลดไฟล์ CSS/JS ไม่เจอ
app.use(express.static(path.join(__dirname, 'web')));

// สำหรับทุกๆ Request ที่เข้ามาที่ root URL ('/') ให้ส่งไฟล์ login.html กลับไป
// นี่คือส่วนสำคัญที่แก้ไขปัญหา Cannot GET /
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'login.html'));
});

// ********** API Endpoints สำหรับ Login และ Register **********

// API สำหรับ Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    console.log(`Login attempt for email: ${email}`);

    const users = readUsers(); // อ่านข้อมูลผู้ใช้จาก users.json
    const user = users.find(u => u.email === email && u.password === password); // ตรวจสอบผู้ใช้

    if (user) {
        res.status(200).json({ message: "Login successful!", token: "dummy-jwt-token-abc123" });
    } else {
        res.status(401).json({ message: "Invalid email or password." });
    }
});

// API สำหรับ Register
app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;
    console.log(`Registering new user: Username: ${username}, Email: ${email}`);

    const users = readUsers(); // อ่านข้อมูลผู้ใช้จาก users.json

    // ตรวจสอบว่าอีเมลซ้ำหรือไม่
    if (users.some(u => u.email === email)) {
        return res.status(409).json({ message: "Email already registered." }); // 409 Conflict
    }

    const newUser = { username, email, password }; // ในโลกจริงต้อง Hash รหัสผ่านก่อนบันทึก
    users.push(newUser); // เพิ่มผู้ใช้ใหม่
    writeUsers(users); // บันทึกลงไฟล์ users.json

    res.status(201).json({ message: "Registration successful!" });
});

// ********** End API Endpoints **********

// Start server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log(`Open your browser at: http://localhost:${port}`);
});
// script.js: JavaScript file for Login, Register, and Home page functionality with basic backend simulation

import { translations, applyTranslation } from './language.js'; // Import from language.js

document.addEventListener('DOMContentLoaded', async () => {
    // Reference to HTML elements
    const showPasswordCheckbox = document.getElementById('showPassword'); // For old login page
    const passwordInput = document.getElementById('password'); // For old login page

    // Language switcher elements (now in navbar)
    const langToggleButton = document.getElementById('langToggleButton'); // ปุ่มเปิด/ปิด dropdown
    const currentLangText = document.getElementById('currentLangText'); // ข้อความภาษาปัจจุบัน
    const langDropdown = document.getElementById('langDropdown'); // dropdown content

    const langOptions = document.querySelectorAll('.lang-option'); // ตัวเลือกภาษาแต่ละตัว

    const loginForm = document.getElementById('loginForm'); // For old login page
    const registerForm = document.getElementById('registerForm'); // For old register page
    const loginFormV2 = document.getElementById('loginFormV2'); // For new login page
    const registerFormV2 = document.getElementById('registerFormV2'); // For new register page

    // Function to toggle password visibility (for Login page - old design)
    if (showPasswordCheckbox && passwordInput) {
        showPasswordCheckbox.addEventListener('change', () => {
            if (showPasswordCheckbox.checked) {
                passwordInput.type = 'text'; // Show password as text
            } else {
                passwordInput.type = 'password'; // Hide password
            }
        });
    }

    // Load language from localStorage or set default to Thai
    let currentLang = localStorage.getItem('selectedLang') || 'th';

    // Function to apply translations to all elements with data-lang-key
    const updateAllTranslations = (lang) => {
        applyTranslation(lang, translations); // Apply translations using the imported function

        // Update the text on the language toggle button
        if (currentLangText) {
            const currentLangKey = `lang${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
            currentLangText.textContent = translations[lang][currentLangKey];
        }
        // Update the text on the language toggle button (Navbar)
        if (currentLangTextNavbar) {
            const currentLangKey = `lang${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
            currentLangTextNavbar.textContent = translations[lang][currentLangKey];
        }
    };

    updateAllTranslations(currentLang); // Apply initial translation on load

    // Toggle dropdown visibility for language switcher
    if (langToggleButton && langDropdown) {
        langToggleButton.addEventListener('click', (event) => {
            langDropdown.classList.toggle('show'); // สลับ class 'show' เพื่อแสดง/ซ่อน Dropdown
            langToggleButton.classList.toggle('active'); // สลับ class 'active' เพื่อหมุนไอคอน
            event.stopPropagation(); // หยุดการแพร่กระจายของ event เพื่อไม่ให้ Dropdown ปิดทันที
        });
    }

    // Close dropdown if clicked outside
    document.addEventListener('click', (event) => {
        if (langToggleButton && langDropdown && !langToggleButton.contains(event.target) && !langDropdown.contains(event.target)) {
            langDropdown.classList.remove('show');
            langToggleButton.classList.remove('active');
        }
        if (langToggleButtonNavbar && langDropdownNavbar && !langToggleButtonNavbar.contains(event.target) && !langDropdownNavbar.contains(event.target)) {
            langDropdownNavbar.classList.remove('show');
            langToggleButtonNavbar.classList.remove('active');
        }
    });

    // Handle language option clicks
    langOptions.forEach(option => {
        option.addEventListener('click', () => {
            const selectedLang = option.dataset.lang;
            currentLang = selectedLang; // Update current language
            localStorage.setItem('selectedLang', selectedLang); // Save selected language to localStorage
            updateAllTranslations(selectedLang); // Apply translations to all relevant elements

            // Hide dropdown after selection
            if (langDropdown) {
                langDropdown.classList.remove('show');
                langToggleButton.classList.remove('active');
            }
            if (langDropdownNavbar) {
                langDropdownNavbar.classList.remove('show');
                langToggleButtonNavbar.classList.remove('active');
            }
        });
    });

    // --- Basic Backend Simulation using localStorage ---

    // Function to get users from localStorage
    const getStoredUsers = () => {
        const users = localStorage.getItem('registeredUsers');
        return users ? JSON.parse(users) : [];
    };

    // Function to save users to localStorage
    const saveUsers = (users) => {
        localStorage.setItem('registeredUsers', JSON.stringify(users));
    };

    // เพิ่ม console.log เพื่อแสดงผู้ใช้ที่ถูกเก็บไว้ใน localStorage เมื่อหน้าเว็บโหลด
    console.log("Registered Users in localStorage:", getStoredUsers());

    // Handle Login form submission (for old login page - index.html)
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default form submission
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const users = getStoredUsers();
            const foundUser = users.find(user => user.email === email && user.password === password);

            if (foundUser) {
                // Simulate successful login
                alert(translations[currentLang]?.loginSuccess || "Login successful! Redirecting to home page...");
                localStorage.setItem('loggedInUserEmail', email); // Store logged-in status
                window.location.href = 'home.html'; // Redirect to home page
            } else {
                alert(translations[currentLang]?.loginFailed || "Invalid email or password.");
            }
        });
    }

    // Handle Login form submission (for new login page - index.html)
    if (loginFormV2) {
        loginFormV2.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('emailV2').value;
            const password = document.getElementById('passwordV2').value;
            console.log('Submitting login:', email);
            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                console.log('Login response:', res.status, data);
                if (res.ok) {
                    localStorage.setItem('loggedInUserEmail', email);
                    localStorage.setItem('authToken', data.token || '');
                    window.location.href = 'home.html';
                } else {
                    alert(data.message || 'Login failed');
                }
            } catch (err) {
                alert('Network error. Please try again.');
                console.error('Login fetch error:', err);
            }
        });
    }

    // Handle Register form submission (for old register page - register.html)
    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default form submission
            const regEmail = document.getElementById('regEmail').value;
            const regPassword = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (regPassword !== confirmPassword) {
                alert(translations[currentLang]?.passwordMismatch || "Password and Confirm Password do not match.");
                return;
            }

            let users = getStoredUsers();
            // Check if user already exists
            if (users.some(user => user.email === regEmail)) {
                alert(translations[currentLang]?.userExists || "User with this email already exists.");
                return;
            }

            // Add new user
            users.push({ email: regEmail, password: regPassword });
            saveUsers(users);

            alert(translations[currentLang]?.registrationSuccess || "Registration successful! Please log in.");
            window.location.href = 'index.html'; // Redirect back to login page
        });
    }

    // Handle Register form submission (for new register page - register.html)
    if (registerFormV2) {
        registerFormV2.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default form submission
            const regEmail = document.getElementById('regEmailV2').value;
            const regPassword = document.getElementById('regPasswordV2').value;
            const confirmPassword = document.getElementById('confirmPasswordV2').value;

            if (regPassword !== confirmPassword) {
                alert(translations[currentLang]?.passwordMismatch || "Password and Confirm Password do not match.");
                return;
            }

            let users = getStoredUsers();
            // Check if user already exists
            if (users.some(user => user.email === regEmail)) {
                alert(translations[currentLang]?.userExists || "User with this email already exists.");
                return;
            }

            // Add new user
            users.push({ email: regEmail, password: regPassword });
            saveUsers(users);

            alert(translations[currentLang]?.registrationSuccess || "Registration successful! Please log in.");
            window.location.href = 'index.html'; // Redirect back to login page
        });
    }
});

// Universal Navbar Button Renderer
export function renderNavbarButtons() {
    const navbarButtons = document.querySelector('.navbar-buttons');
    if (!navbarButtons) return;
    navbarButtons.innerHTML = '';
    const loggedInUserEmail = localStorage.getItem('loggedInUserEmail');
    if (loggedInUserEmail) {
        const logoutBtn = document.createElement('a');
        logoutBtn.textContent = 'Log Out';
        logoutBtn.className = 'navbar-btn-login';
        logoutBtn.style.cursor = 'pointer';
        logoutBtn.onclick = function() {
            localStorage.removeItem('loggedInUserEmail');
            localStorage.removeItem('authToken');
            window.location.href = 'home.html';
        };
        navbarButtons.appendChild(logoutBtn);
    }
}

// === Navbar Language Dropdown ===
document.addEventListener('DOMContentLoaded', () => {
    const langBtn = document.getElementById('navbarLangBtn');
    const langDropdown = document.getElementById('navbarLangDropdown');
    const langOptions = langDropdown ? langDropdown.querySelectorAll('.navbar-lang-option') : [];
    let currentLang = localStorage.getItem('selectedLang') || 'th';

    // Toggle dropdown
    if (langBtn && langDropdown) {
        langBtn.addEventListener('click', (e) => {
            langDropdown.classList.toggle('show');
            e.stopPropagation();
        });
        // Hide dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!langDropdown.contains(e.target) && e.target !== langBtn) {
                langDropdown.classList.remove('show');
            }
        });
    }
    // Handle language selection
    langOptions.forEach(option => {
        option.addEventListener('click', () => {
            const selectedLang = option.getAttribute('data-lang');
            localStorage.setItem('selectedLang', selectedLang);
            langDropdown.classList.remove('show');
            // Reload page to apply language (or call translation function if SPA)
            location.reload();
        });
    });
});

// === Navbar Language Select Modern ===
document.addEventListener('DOMContentLoaded', () => {
    const langSelect = document.getElementById('navbarLangSelect');
    if (langSelect) {
        // Set initial value from localStorage
        const currentLang = localStorage.getItem('selectedLang') || 'th';
        langSelect.value = currentLang;
        // Change language on select
        langSelect.addEventListener('change', (e) => {
            localStorage.setItem('selectedLang', langSelect.value);
            // Reload page to apply language (or call translation function if SPA)
            location.reload();
        });
    }
});

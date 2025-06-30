// Đảm bảo mã JavaScript chỉ chạy sau khi DOM đã tải xong
document.addEventListener('DOMContentLoaded', function() {
    // Khởi tạo mảng lưu trữ lịch sử chat (lưu trong session)
    let chatHistory = [];

    // Tạo và thêm khu vực hiển thị chat nếu chưa có
    let chatHistoryContainer = document.getElementById('chat-history');
    if (!chatHistoryContainer) {
        chatHistoryContainer = document.createElement('div');
        chatHistoryContainer.id = 'chat-history';
        chatHistoryContainer.className = 'chat-history';
        
        // Chèn khu vực chat history vào trước input area
        const inputArea = document.querySelector('.input-area');
        if (inputArea && inputArea.parentNode) {
            inputArea.parentNode.insertBefore(chatHistoryContainer, inputArea);
        }
    }

    // Đồng bộ nội dung từ div sang textarea ẩn khi người dùng gõ
    const inputVisual = document.getElementById('chat-input-visual');
    const inputActual = document.getElementById('chat-input-actual');

    if (inputVisual && inputActual) {
        inputVisual.addEventListener('input', () => {
            inputActual.value = inputVisual.innerText;
        });

        // Xử lý khi nhấn Enter (trong contenteditable)
        inputVisual.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const message = inputVisual.innerText.trim();
                if (message) {
                    sendMessageToServer(message);
                    inputVisual.innerText = '';
                    inputActual.value = '';
                }
            }
        });
    }

    // Xử lý nút gửi (Send)  || document.querySelector('.voice-active'
    const sendButton = document.querySelector('#send-button');
    if (sendButton) {
        sendButton.addEventListener('click', () => {
            const message = inputVisual ? inputVisual.innerText.trim() : '';
            if (message) {
                sendMessageToServer(message);
                if (inputVisual) {
                    inputVisual.innerText = '';
                    if (inputActual) inputActual.value = '';
                }
            }
        });
    }

    // Thiết lập nút đính kèm
    setupAttachButton();
    
    // Thiết lập lại sau 500ms để đảm bảo tất cả DOM elements đã được tải
    setTimeout(setupAttachButton, 500);
    
    // Add an initial message to show the system is ready
    setTimeout(() => {
        addMessageToChat('bot', "Xin chào! Tôi là HealthTrust AI, trợ lý y tế ảo. Bạn có thể hỏi tôi bất kỳ câu hỏi nào về sức khỏe và y tế, hoặc tải lên hình ảnh để tôi phân tích.");
    }, 500);
});

// Hàm thiết lập nút đính kèm
function setupAttachButton() {
    // Tìm nút attach và file input
    const attachBtn = document.querySelector('button[aria-label="Attach file"]') || 
                      document.querySelector('.icon-btn .fa-plus')?.closest('button');
    const fileInput = document.getElementById('file-input') || createFileInput();
    
    if (!attachBtn) return;
    
    // Xóa event listeners cũ để tránh trùng lặp
    const newAttachBtn = attachBtn.cloneNode(true);
    attachBtn.parentNode.replaceChild(newAttachBtn, attachBtn);
    
    // Thêm event listener mới
    newAttachBtn.addEventListener('click', function(e) {
        e.preventDefault();
        fileInput.click();
    });
    
    // Xử lý khi người dùng chọn file
    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;
        
        // Kiểm tra kích thước file (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            addMessageToChat('error', 'File quá lớn. Vui lòng chọn file nhỏ hơn 5MB.');
            fileInput.value = ''; // Reset input
            return;
        }
        
        // Kiểm tra loại file (chỉ chấp nhận ảnh)
        if (!file.type.startsWith('image/')) {
            addMessageToChat('error', 'Vui lòng chỉ chọn file ảnh.');
            fileInput.value = ''; // Reset input
            return;
        }
        
        // Hiển thị preview ảnh
        const reader = new FileReader();
        reader.onload = function (e) {
            addMessageToChat('user', `<img src="${e.target.result}" alt="image" class="user-image-preview">`);
        };
        reader.readAsDataURL(file);
        
        // Tạo FormData và gửi ảnh lên server
        const formData = new FormData();
        formData.append('image', file);
        
        const loadingId = showLoading();
        
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Upload failed with status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            hideLoading(loadingId);
            
            // Check for error response
            if (data.error) {
                addMessageToChat('error', `Lỗi: ${data.error}`);
                return;
            }
            
            let answer = data.answer;
            if (typeof answer === 'object' && answer !== null) {
                // Check for error in object
                if (answer.error) {
                    addMessageToChat('error', `Lỗi phân tích: ${answer.error}`);
                    return;
                }
                
                answer = "Kết quả phân tích ảnh:\n" +
                         "Thông tin: " + (answer.gemini_output || answer.info || "") + "\n" +
                         "Từ khóa: " + (answer.keywords ? answer.keywords.join(", ") : "");
            }
            addMessageToChat('bot', answer);
        })
        .catch(err => {
            hideLoading(loadingId);
            addMessageToChat('error', "Không thể xử lý ảnh, vui lòng thử lại.");
        });
        
        fileInput.value = ''; // Reset input
    });
}

// Tạo file input mới nếu không tìm thấy
function createFileInput() {
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'file-input';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    return input;
}

// Hàm gửi tin nhắn đến server (cho câu hỏi)
function sendMessageToServer(message) {
    addMessageToChat('user', message);
    const loadingId = showLoading();
    
    fetch('/ask', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question: message })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        hideLoading(loadingId);
        let answer = data.answer;
        
        if (data.error) {
            addMessageToChat('error', `Lỗi: ${data.error}`);
            return;
        }
        
        // Nếu answer là object thì chuyển thành chuỗi mô tả
        if (typeof answer === 'object' && answer !== null) {
            if (answer.error) {
                addMessageToChat('error', `Lỗi phân tích: ${answer.error}`);
                return;
            }
            
            answer = "Kết quả phân tích:\n" +
                     "Thông tin: " + (answer.gemini_output || answer.info || "") + "\n" +
                     "Từ khóa: " + (answer.keywords ? answer.keywords.join(", ") : "");
        }
        addMessageToChat('bot', answer);
    })
    .catch(error => {
        hideLoading(loadingId);
        addMessageToChat('error', "Đã xảy ra lỗi khi gửi tin nhắn. Vui lòng thử lại.");
    });
}

// Hàm thêm tin nhắn vào giao diện chat
function addMessageToChat(type, content, index = null) {
    if (typeof content !== 'string') {
        content = String(content);
    }
    
    const chatHistory = document.getElementById('chat-history');
    if (!chatHistory) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}-message`;
    
    let headerHTML = '';
    if (type === 'user') {
        headerHTML = `
            <div class="message-header">
                <div class="message-sender">Bạn</div>
                <div class="message-avatar user-avatar">${getUserInitial()}</div>
            </div>
        `;
    } else if (type === 'bot') {
        headerHTML = `
            <div class="message-header">
                ${index ? `<div class="message-index">${index}</div>` : ''}
                <div class="message-avatar bot-avatar">AI</div>
                <div class="message-sender">HealthTrust</div>
            </div>
        `;
    } else if (type === 'error') {
        headerHTML = `
            <div class="message-header">
                <div class="message-avatar error-avatar">!</div>
                <div class="message-sender">Thông báo</div>
            </div>
        `;
    }
    
    const contentHTML = `<div class="message-content">${type === 'bot' ? formatBotMessage(content) : content}</div>`;
    
    messageDiv.innerHTML = headerHTML + contentHTML;
    chatHistory.appendChild(messageDiv);
    
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
        chatContainer.classList.add('has-messages');
        if (chatHistory.children.length > 4) {
            chatContainer.classList.add('many-messages');
        }
    }
    
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Hiển thị trạng thái đang tải
function showLoading() {
    const loadingId = 'loading-' + Date.now();
    const chatHistory = document.getElementById('chat-history');
    if (!chatHistory) return loadingId;
    
    const loadingDiv = document.createElement('div');
    loadingDiv.id = loadingId;
    loadingDiv.className = 'chat-message bot-message loading-message';
    loadingDiv.innerHTML = `
        <div class="message-header">
            <div class="message-avatar bot-avatar">AI</div>
            <div class="message-sender">HealthTrust</div>
        </div>
        <div class="message-content loading-animation">
            <span>.</span><span>.</span><span>.</span>
        </div>
    `;
    
    chatHistory.appendChild(loadingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return loadingId;
}

// Ẩn trạng thái đang tải
function hideLoading(loadingId) {
    const loadingElement = document.getElementById(loadingId);
    if (loadingElement) {
        loadingElement.remove();
    }
}

// Lấy chữ cái đầu tên người dùng
function getUserInitial() {
    const userAvatar = document.querySelector('.user-avatar');
    if (userAvatar && userAvatar.innerText && userAvatar.innerText.length > 0) {
        return userAvatar.innerText.charAt(0);
    }
    
    try {
        const username = sessionStorage.getItem('username');
        if (username && username.length > 0) {
            return username.charAt(0).toUpperCase();
        }
    } catch (e) {
        // Ignore errors
    }
    
    return 'U'; // Default fallback
}

// Hàm định dạng tin nhắn của bot (hỗ trợ markdown đơn giản)
function formatBotMessage(content) {
    if (typeof content !== 'string') {
        content = String(content);
    }
    
    content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
    content = content.replace(/\n/g, '<br>');
    content = content.replace(/\[(\d+)\]/g, '<a href="#reference-$1">[$1]</a>');
    return content;
}
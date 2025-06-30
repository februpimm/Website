console.log("Chatbot UI loaded.");

// Ví dụ: Thêm sự kiện click cho nút voice
const voiceButton = document.querySelector('.voice-btn');
const chatInput = document.getElementById('chat-input');

if (voiceButton) {
    voiceButton.addEventListener('click', () => {
        console.log("Voice button clicked!");
        // Trong tương lai, bạn có thể thêm chức năng nhận dạng giọng nói ở đây
        alert("Chức năng Voice chưa được triển khai.");
    });
}

// Bạn có thể thêm các trình xử lý sự kiện khác cho các nút Attach, Search, Reason, input, v.v.
// Ví dụ: lắng nghe sự kiện nhấn Enter trong ô input
chatInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { // Gửi tin nhắn khi nhấn Enter (không nhấn Shift)
        e.preventDefault(); // Ngăn không cho xuống dòng mặc định
        const message = chatInput.value.trim();
        if (message) {
            console.log("Sending message:", message);
            // Thêm code để xử lý gửi tin nhắn ở đây
            chatInput.value = ''; // Xóa nội dung ô input sau khi gửi
        }
    }
});
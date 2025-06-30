
//----1/6/2025 added feature voice handling---
//1/6/2025 handling block
function getSessionUserId() {
    let userId = sessionStorage.getItem('chatbotUserId');
    if (!userId) {
        // Generate a simple unique ID
        userId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
        sessionStorage.setItem('chatbotUserId', userId);
        console.log("Generated new session UserId:", userId);
    }
    return userId;
}
const currentSessionUserId = getSessionUserId(); // Get or generate it once when script loads
// --- End User ID Management ---
//1/6/2025 handling block

//Lấy phần tử HTML có class message input/chat-body tương ứng
const messageInput = document.querySelector(".message-input");
const chatBody = document.querySelector(".chat-body");
const sendMessageButton = document.querySelector("#send-message");
const chatbotToggler = document.querySelector("#chatbot-toggler");
const closeToggler = document.querySelector("#close-chatbot");
const fileInput = document.querySelector("#file-input");
const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
const fileCancelButton = document.querySelector("#file-cancel");
const voiceInputButton = document.getElementById("voice-input-button");
const messageInputForVoice = document.querySelector(".message-input"); 
const API_URL = "http://localhost:3000";
console.log("Using API_URL:", API_URL);

// +++ START: VOICE INPUT CODE 1/6 +++


if (voiceInputButton) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
        const recognition = new SpeechRecognition(); // Initialize ONCE here
        let isRecording = false; // isRecording scoped correctly for all handlers

        // Configure recognition properties
        recognition.continuous = false;
        recognition.lang = 'vi-VN';    // Change as needed, e.g., 'vi-VN' for Vietnamese
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        // Event listener for the voice input button
        voiceInputButton.addEventListener("click", () => {
            if (!isRecording) {
                try {
                    recognition.start();
                    // Visual feedback is handled by onstart
                } catch (error) {
                    console.error("Error starting recognition (e.g., already started or another issue):", error);
                    // Optionally reset UI if start fails unexpectedly
                    isRecording = false; // Ensure state is reset
                    voiceInputButton.textContent = "mic";
                    voiceInputButton.classList.remove("is-recording");
                }
            } else {
                recognition.stop();
                // Visual feedback is handled by onend
            }
        });

        // --- Speech Recognition Event Handlers ---

        recognition.onstart = () => {
            console.log("Voice recognition service has started.");
            isRecording = true;
            voiceInputButton.textContent = "settings_voice"; // Change icon
            voiceInputButton.classList.add("is-recording");  // Add class for CSS animation
        };

        recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript.trim();
            console.log("Transcript: ", transcript);

            if (messageInputForVoice) {
                const currentText = messageInputForVoice.value;
                messageInputForVoice.value = currentText ? currentText + " " + transcript : transcript;
                messageInputForVoice.dispatchEvent(new Event("input")); // For auto-resizing
            } else {
                console.error("messageInputForVoice (textarea) not found for voice input.");
            }
            // Optional: auto-send
            // if (messageInputForVoice && messageInputForVoice.value.trim()) {
            //    document.getElementById("send-message").click();
            // }
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            let userMessage = `Speech recognition error: ${event.error}.`;
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                userMessage = "Microphone access was denied. Please allow microphone access in your browser settings to use voice input.";
            } else if (event.error === 'no-speech') {
                userMessage = "No speech was detected. Please try speaking again.";
            } else if (event.error === 'network') {
                userMessage = "A network error occurred during speech recognition. Please check your connection.";
            } else if (event.error === 'audio-capture') {
                userMessage = "Failed to capture audio. Please ensure your microphone is working correctly.";
            }
            alert(userMessage);

            // Ensure UI is reset
            isRecording = false;
            voiceInputButton.textContent = "mic";
            voiceInputButton.classList.remove("is-recording");
        };

        recognition.onend = () => {
            console.log("Speech recognition service has ended.");
            isRecording = false;
            voiceInputButton.textContent = "mic"; // Reset icon
            voiceInputButton.classList.remove("is-recording"); // Remove class
        };

    } else {
        console.warn("Speech Recognition API not supported in this browser.");
        voiceInputButton.style.display = "none";
        alert("Sorry, voice input is not supported by your browser.");
    }
} else {
    console.warn("Voice input button #voice-input-button not found in the DOM.");
}
// +++ END: VOICE INPUT CODE 1/6 +++


// userData stores base64 preview data for an image.
// The actual text for a message is read directly from messageInput.value.
// The actual File object for an image is read directly from fileInput.files[0].
const userData = {
    // message: null, // Text is now read directly when needed
    file: {
        data: null, // base64 string for display preview in user's own bubble
        mime_type: null
    }
};

const initialInputHeight = messageInput.scrollHeight;

// Create message element with dynamic classes and return it
const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
};

const responseFromChatbot = async (api, body, incomingMessageDiv) => {
    const messageElement = incomingMessageDiv.querySelector(".message-text");
    const requestOptions = {
        method: "POST",
        body,
    };
    if (!(body instanceof FormData)) {
        requestOptions.headers = { 'Content-Type': 'application/json' };
    }

    try {
        const response = await fetch(`${API_URL}/${api}`, requestOptions);
        const data = await response.json();

        if (!response.ok) {
            const errorMessage = (data && data.answer && data.answer.error) || data.error || `Server responded with status ${response.status}`;
            throw new Error(errorMessage);
        }
        
        console.log("Data from server:", data); 
        
        let displayMessage; 
        const responseObject = data.answer; 

        if (typeof responseObject === 'object' && responseObject !== null) {
            if (responseObject.error) { 
                displayMessage = `Lỗi từ server: ${responseObject.error}`;
                messageElement.style.color = "#ff0000";
            } else if (typeof responseObject.answer === 'string') { 
                displayMessage = responseObject.answer;
            } else if (responseObject.info) { 
                 displayMessage = responseObject.info;
            } else {
                const actualInfoString = responseObject.answer; 
                const keywordsArray = responseObject.keywords;

                displayMessage = "Kết quả phân tích:\n" +
                    "Thông tin: " + (actualInfoString || "Không có thông tin.") + "\n" +
                    "Từ khóa: " + (keywordsArray && keywordsArray.length > 0 ? keywordsArray.join(", ") : "Không có từ khóa.");
                displayMessage = displayMessage.replaceAll('*', '').trim();
            }
        } else if (typeof responseObject === 'string') { 
            displayMessage = responseObject;
        } else {
            displayMessage = "Phản hồi không xác định từ server.";
            console.warn("Unexpected response structure from server:", data);
        }
        
        messageElement.innerText = displayMessage.replaceAll('**', '').trim();

    } catch (error) {
        console.error("Error in responseFromChatbot:", error);
        messageElement.innerText = `Lỗi: ${error.message}`;
        messageElement.style.color = "#ff0000";
    } finally {
        incomingMessageDiv.classList.remove("thinking");
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    }
};

//1/6/2025 block 2
const handleOutgoingMessage = (e) => {
    // e.preventDefault(); // This should be called if 'e' is an actual browser event.
                        // If called programmatically without a real event, this might not be needed or 'e' needs to be a mock.
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
    }

    const textForThisMessage = messageInput.value.trim();
    const imageFileForThisMessage = fileInput.files[0];

    if (!textForThisMessage && !imageFileForThisMessage) { //nếu không có ảnh & image thì không trả về gì cả
        return;
    }
    
    let outgoingMessageContent = "";
    if (textForThisMessage) {
        outgoingMessageContent += `<div class="message-text"></div>`;
    }
    if (userData.file && userData.file.data) { 
        outgoingMessageContent += `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="attachment" />`;
    }
    const outgoingMessageDiv = createMessageElement(outgoingMessageContent, "user-message");
    if (textForThisMessage) {
        outgoingMessageDiv.querySelector(".message-text").textContent = textForThisMessage;
    }
    chatBody.appendChild(outgoingMessageDiv);

    messageInput.value = ""; 
    fileInput.value = "";    
    userData.file = { data: null, mime_type: null }; 
    fileUploadWrapper.classList.remove("file-uploaded");
    const previewImg = fileUploadWrapper.querySelector("img");
    if (previewImg) {
        previewImg.src = "#"; 
    }
    messageInput.dispatchEvent(new Event("input"));

    setTimeout(() => {
        const botAvatarAndThinkingIndicator = `<svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024"><path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"></path></svg><div class="message-text"><div class="thinking-indicator"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`;
        const incomingMessageDiv = createMessageElement(botAvatarAndThinkingIndicator, "bot-message", "thinking");
        chatBody.appendChild(incomingMessageDiv);
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

        let requestMade = false;
        const userIdToSend = currentSessionUserId; 

        if (imageFileForThisMessage) {
            const formData = new FormData();
            formData.append('image', imageFileForThisMessage);
            if (textForThisMessage) {
                formData.append('question', textForThisMessage);
            } else {
                 formData.append('question', '');
            }
            formData.append('userId', userIdToSend); 
            responseFromChatbot("upload", formData, incomingMessageDiv);
            requestMade = true;
        } else if (textForThisMessage) {
            responseFromChatbot("ask", JSON.stringify({ 
                question: textForThisMessage, 
                userId: userIdToSend  
            }), incomingMessageDiv);
            requestMade = true;
        }

        if (!requestMade && incomingMessageDiv) { 
            // If somehow no request was made but we showed a thinking bubble, remove it or show error
            incomingMessageDiv.remove(); // Example: remove the thinking bubble
            console.warn("handleOutgoingMessage: No text or image to send, but thinking indicator was shown.");
         }
    }, 600);
};
//1/6/2025 block 2

// handle Enter key press for sending messages
messageInput.addEventListener("keydown", (e) => {
    const currentText = e.target.value.trim();
    const imageIsSelected = !!fileInput.files[0];

    if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 768) {
        e.preventDefault(); 
        if (currentText || imageIsSelected) { 
            handleOutgoingMessage(e);
        }
    }
});

messageInput.addEventListener("input", () => {
    messageInput.style.height = `${initialInputHeight}px`;
    messageInput.style.height = `${messageInput.scrollHeight}px`;
    document.querySelector(".chat-form").style.borderRadius = messageInput.scrollHeight > initialInputHeight ? "15px" : "32px";
});

// Upload ảnh
fileInput.addEventListener("change", (e) => {
    const file = fileInput.files[0];
    if (!file) {
        console.log("Không có file được chọn.");
        userData.file = { data: null, mime_type: null };
        fileUploadWrapper.classList.remove("file-uploaded");
        fileUploadWrapper.querySelector("img").src = "#";
        return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        alert('File quá lớn. Vui lòng chọn file nhỏ hơn 5MB.');
        fileInput.value = ''; 
        userData.file = { data: null, mime_type: null };
        fileUploadWrapper.classList.remove("file-uploaded");
        fileUploadWrapper.querySelector("img").src = "#";
        return;
    }

    if (!file.type.startsWith('image/')) {
        alert('Vui lòng chỉ chọn file ảnh.');
        fileInput.value = ''; 
        userData.file = { data: null, mime_type: null };
        fileUploadWrapper.classList.remove("file-uploaded");
        fileUploadWrapper.querySelector("img").src = "#";
        return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
        fileUploadWrapper.querySelector("img").src = ev.target.result;
        fileUploadWrapper.classList.add("file-uploaded");
        const base64String = ev.target.result.split(",")[1];
        userData.file = {
            data: base64String,
            mime_type: file.type
        };
    };
    reader.readAsDataURL(file);
});

fileCancelButton.addEventListener("click", () => {
    userData.file = { data: null, mime_type: null }; 
    fileInput.value = ""; 
    fileUploadWrapper.classList.remove("file-uploaded");
    fileUploadWrapper.querySelector("img").src = "#"; 
});

const picker = new EmojiMart.Picker({
    theme: "light",
    skinTonePosition: "none",
    previewPosition: "none",
    onEmojiSelect: (emoji) => {
        const { selectionStart: start, selectionEnd: end } = messageInput;
        messageInput.setRangeText(emoji.native, start, end, "end");
        messageInput.focus();
        messageInput.dispatchEvent(new Event("input")); 
    },
    onClickOutside: (e) => {
        if (e.target.id === "emoji-picker") {
            document.body.classList.toggle("show-emoji-picker");
        } else {
            document.body.classList.remove("show-emoji-picker");
        }
    }
});
document.querySelector(".chat-form").appendChild(picker);

sendMessageButton.addEventListener("click", (e) => {
    const currentText = messageInput.value.trim();
    const imageIsSelected = !!fileInput.files[0];
    if (currentText || imageIsSelected) {
        handleOutgoingMessage(e);
    }
});

chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));
closeToggler.addEventListener("click", () => document.body.classList.remove("show-chatbot"));
document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());
document.querySelector("#emoji-picker").addEventListener("click", (e) => {
    e.stopPropagation(); 
    document.body.classList.toggle("show-emoji-picker");
});
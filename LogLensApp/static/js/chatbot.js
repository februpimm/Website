function initChatbotTab() {
    // UserID quản lý session
    function getSessionUserId() {
        let userId = sessionStorage.getItem('chatbotUserId');
        if (!userId) {
            userId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
            sessionStorage.setItem('chatbotUserId', userId);
            console.log("Generated new session UserId:", userId);
        }
        return userId;
    }
    const currentSessionUserId = getSessionUserId();

    // Lấy phần tử DOM - Ưu tiên getElementById nếu có id
    const messageInput = document.getElementById("message-input");
    const chatBody = document.querySelector(".chat-body");
    const sendMessageButton = document.getElementById("send-message");
    const fileInput = document.getElementById("file-input");
    const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
    const fileCancelButton = document.getElementById("file-cancel");
    const voiceInputButton = document.getElementById("voice-input-button");
    const messageInputForVoice = messageInput; // chỉ cần dùng chung
    const API_URL = "";
    console.log("Using API_URL:", API_URL);

    // Voice input
    if (voiceInputButton) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            let isRecording = false;

            recognition.continuous = false;
            recognition.lang = 'vi-VN';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            voiceInputButton.addEventListener("click", () => {
                if (!isRecording) {
                    try {
                        recognition.start();
                    } catch (error) {
                        isRecording = false;
                        voiceInputButton.textContent = "mic";
                        voiceInputButton.classList.remove("is-recording");
                    }
                } else {
                    recognition.stop();
                }
            });

            recognition.onstart = () => {
                isRecording = true;
                voiceInputButton.textContent = "settings_voice";
                voiceInputButton.classList.add("is-recording");
            };

            recognition.onresult = (event) => {
                const transcript = event.results[event.results.length - 1][0].transcript.trim();
                if (messageInputForVoice) {
                    const currentText = messageInputForVoice.value;
                    messageInputForVoice.value = currentText ? currentText + " " + transcript : transcript;
                    messageInputForVoice.dispatchEvent(new Event("input"));
                }
            };

            recognition.onerror = (event) => {
                isRecording = false;
                voiceInputButton.textContent = "mic";
                voiceInputButton.classList.remove("is-recording");
            };

            recognition.onend = () => {
                isRecording = false;
                voiceInputButton.textContent = "mic";
                voiceInputButton.classList.remove("is-recording");
            };

        } else {
            voiceInputButton.style.display = "none";
            alert("Sorry, voice input is not supported by your browser.");
        }
    }

    // Ảnh preview
    const userData = {
        file: {
            data: null,
            mime_type: null
        }
    };

    const initialInputHeight = messageInput.scrollHeight;

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
            }

            messageElement.innerText = displayMessage.replaceAll('**', '').trim();

        } catch (error) {
            messageElement.innerText = `Lỗi: ${error.message}`;
            messageElement.style.color = "#ff0000";
        } finally {
            incomingMessageDiv.classList.remove("thinking");
            chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
        }
    };

    const handleOutgoingMessage = (e) => {
        if (e && typeof e.preventDefault === 'function') {
            e.preventDefault();
        }

        const textForThisMessage = messageInput.value.trim();
        const imageFileForThisMessage = fileInput.files[0];

        if (!textForThisMessage && !imageFileForThisMessage) {
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
                incomingMessageDiv.remove();
            }
        }, 600);
    };

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
        document.getElementById("chat-form").style.borderRadius = messageInput.scrollHeight > initialInputHeight ? "15px" : "32px";
    });

    // Upload ảnh
    fileInput.addEventListener("change", (e) => {
        const file = fileInput.files[0];
        if (!file) {
            userData.file = { data: null, mime_type: null };
            fileUploadWrapper.classList.remove("file-uploaded");
            fileUploadWrapper.querySelector("img").src = "#";
            return;
        }

        const maxSize = 5 * 1024 * 1024;
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

    document.getElementById("file-upload").addEventListener("click", () => fileInput.click());

    sendMessageButton.addEventListener("click", (e) => {
        const currentText = messageInput.value.trim();
        const imageIsSelected = !!fileInput.files[0];
        if (currentText || imageIsSelected) {
            handleOutgoingMessage(e);
        }
    });
}

// Chỉ gọi khi chuyển tab Chatbot
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav li');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            if (tabId === "chatbot") {
                if (!window.chatbotTabInitialized) {
                    window.chatbotTabInitialized = true;
                    initChatbotTab();
                }
            }
        });
    });
});

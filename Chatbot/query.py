import google.generativeai as genai
import logging
import os
from dotenv import load_dotenv

# 1. THIẾT LẬP CƠ BẢN
# Tải API key từ file key.env
load_dotenv(".env")
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Cấu hình Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# 2. Chatbot
class BasicChatBot:
    """
    Một chatbot đơn giản không lưu trữ bất kỳ dữ liệu hay lịch sử nào.
    """
    def __init__(self):
        # Khởi tạo mô hình AI của Google
        self.model = genai.GenerativeModel('models/gemini-2.5-flash-preview-05-20')
        logging.info("Model: gemini-2.5-flash")

    def get_answer(self, query):
        """
        Gửi thẳng câu hỏi đến AI và nhận lại câu trả lời.
        """
        # Prompt đơn giản, chỉ chứa câu hỏi hiện tại của người dùng
        # Đây là prompt mới
        prompt = f"""
        Bạn là một trợ lý AI chuyên gia, đóng vai trò là nhà phân tích về bền vững và thị trường carbon cho sàn giao dịch Air Carbon DEX. Nhiệm vụ của bạn là cung cấp thông tin chính xác, cập nhật và sâu sắc về các chủ đề ESG, Net Zero, và Thị trường Carbon cho người dùng.

        Khi nhận được câu hỏi, hãy tuân thủ nghiêm ngặt quy trình sau:

        1. NGHIÊN CỨU CHUYÊN SÂU:
        - Dựa vào kiến thức đã được huấn luyện từ các nguồn dữ liệu lớn và đáng tin cậy.
        - Nếu không có thông tin chắc chắn, hãy ưu tiên kiến thức từ các nguồn tham khảo hàng đầu sau đây:
            * UNFCCC (Công ước khung của Liên Hợp Quốc về Biến đổi Khí hậu - https://unfccc.int/)
            * IPCC (Ban liên chính phủ về Biến đổi Khí hậu - https://www.ipcc.ch/)
            * World Bank Group (https://www.worldbank.org/en/topic/climatechange)
            * IEA (Cơ quan Năng lượng Quốc tế - https://www.iea.org/)
            * GRI (Global Reporting Initiative - https://www.globalreporting.org/)
            * SASB (Sustainability Accounting Standards Board - https://sasb.org/)
            * Các nguồn tin tài chính uy tín như Bloomberg Green, Reuters, và Financial Times.
            * Tại Việt Nam: Các thông tin từ Bộ Tài nguyên và Môi trường (MONRE).

        2. TỔNG HỢP VÀ PHÂN TÍCH:
        - Tổng hợp thông tin từ nhiều khía cạnh để đưa ra câu trả lời toàn diện.
        - Ưu tiên các báo cáo mới nhất, các khung pháp lý, và các tiêu chuẩn quốc tế được công nhận rộng rãi.
        - Giải thích các khái niệm phức tạp một cách rõ ràng và súc tích.

        3. PHONG CÁCH VÀ CẤU TRÚC TRẢ LỜI:
        - Sử dụng ngôn ngữ chuyên nghiệp, khách quan, phù hợp với nhà đầu tư, doanh nghiệp và các bên liên quan.
        - Sắp xếp thông tin theo một trình tự logic, ví dụ:
            1. Định nghĩa / Tổng quan.
            2. Cơ chế hoạt động / Quy định pháp lý.
            3. Tác động / Lợi ích và Rủi ro.
            4. Ví dụ thực tiễn / Tình hình thị trường (nếu có).
        - Giải thích các thuật ngữ viết tắt (ví dụ: ESG, VER, CERs) ngay trong lần đầu đề cập.

        4. TRÍCH DẪN (NẾU CÓ THỂ):
        - Khi đề cập đến một số liệu hoặc một báo cáo cụ thể, hãy cố gắng nêu rõ nguồn. Ví dụ: "(theo báo cáo của IEA năm 2024)".
        - Cuối câu trả lời, có thể liệt kê các nguồn tham khảo chính đã sử dụng để người dùng có thể tìm hiểu thêm.

        5. LƯU Ý ĐẶC BIỆT VÀ MIỄN TRỪ TRÁCH NHIỆM:
        - Nếu không tìm thấy thông tin đáng tin cậy, hãy trả lời một cách trung thực: "Tôi không có đủ dữ liệu đáng tin cậy về chủ đề [chủ đề] để đưa ra câu trả lời chính xác vào lúc này."
        - Luôn kết thúc câu trả lời bằng một lời miễn trừ trách nhiệm rõ ràng và bắt buộc: "Thông tin này chỉ mang tính chất tham khảo và cung cấp kiến thức chung, không cấu thành lời khuyên đầu tư, pháp lý hay tài chính. Vui lòng tham khảo ý kiến của các chuyên gia có trình độ để được tư vấn cụ thể."

        Câu hỏi của người dùng: "{query}"
"""
        generation_config = {
            "temperature": 0.7,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 8192,
        }
        safety_settings = [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        ]

        try:
            # Gọi API để tạo nội dung
            response = self.model.generate_content(prompt, generation_config=generation_config, safety_settings=safety_settings)
            return response.text
        except Exception as e:
            logging.error(f"Lỗi khi gọi Gemini API: {e}")
            return "Xin lỗi, tôi đang gặp sự cố và không thể trả lời lúc này."

# 3. HÀM CHẠY CHÍNH
def main():
    """
    Hàm chính để bắt đầu cuộc trò chuyện.
    """
    chatbot = BasicChatBot()
    while True:
        user_query = input("\nBạn: ")
        if user_query.lower() == 'exit':
            print("Tạm biệt!")
            break
        
        # Lấy câu trả lời từ bot và in ra màn hình
        bot_answer = chatbot.get_answer(user_query)
        print(f"Bot: {bot_answer}")

# Điểm bắt đầu của chương trình
if __name__ == "__main__":
    main()
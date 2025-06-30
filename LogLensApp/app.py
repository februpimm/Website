# app.py

import os
import sqlite3
import pandas as pd
import json
from query import BasicChatBot
from flask import Flask, render_template, jsonify, request, g
from parsinglog import parse_log_line



def load_settings():
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE) as f:
            return json.load(f)
    # Nếu file chưa tồn tại, trả về mặc định
    return {
        "anomaly_threshold": 0.8,
        "alert_email": "admin@example.com",
        "logs_per_page": 20
    }

def save_settings(settings):
    with open(SETTINGS_FILE, 'w') as f:
        json.dump(settings, f)
        
# Import class LogPredictor từ file predictor.py
from predictor import LogPredictor

# --- Cấu hình ứng dụng ---
APP_ROOT = os.path.dirname(os.path.abspath(__file__))
SETTINGS_FILE = os.path.join(APP_ROOT, 'settings.json')
# Giả sử model của bạn nằm trong thư mục 'model' cùng cấp với app.py
MODEL_PATH = os.path.join(APP_ROOT, 'catboost_model.joblib')

# !!! QUAN TRỌNG: Đảm bảo các danh sách này khớp 100% với lúc huấn luyện !!!
# Tốt nhất là tải các thông tin này từ file model_config.json
MODEL_COLUMNS = ['method', 'protocol', 'status', 'size', 'hour_of_day', 'day_of_week', 'is_weekend', 
                 'part_of_day', 'hour_sin', 'hour_cos', 'day_of_week_sin', 'day_of_week_cos', 'time_since_last_event', 
                 'status_is_client_error', 'status_is_server_error', 'status_is_success', 'status_is_redirect',
                   'size_is_zero', 'referrer_len', 'referrer_entropy', 'referrer_is_empty', 'referrer_domain',
                     'referrer_is_external_or_valid']

CATEGORICAL_FEATURES = ['method', 'protocol', 'part_of_day', 'referrer_domain']



# --- Khởi tạo ứng dụng Flask ---
app = Flask(__name__)
DB_PATH = os.path.join(APP_ROOT, '..', 'database', 'logs.db')
app.config['DATABASE'] = os.path.abspath(DB_PATH)
# Khởi tạo chatbot
chatbot = BasicChatBot()
# =========================================================
# === BỔ SUNG ĐOẠN CODE BỊ THIẾU VÀO ĐÂY ===
# =========================================================
def get_db():
    """Mở một kết nối database mới nếu chưa có cho context hiện tại."""
    if 'db' not in g:
        g.db = sqlite3.connect(
            app.config['DATABASE'],
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(e=None):
    """Đóng kết nối database khi request kết thúc để tránh rò rỉ."""
    db = g.pop('db', None)
    if db is not None:
        db.close()
# =========================================================



try:
    log_predictor = LogPredictor(
        model_path=MODEL_PATH,
        model_columns=MODEL_COLUMNS,
        cat_features=CATEGORICAL_FEATURES
    )
except FileNotFoundError as e:
    print(f"CRITICAL ERROR: {e}")
    print("Cannot start the application without the model file.")
    # Trong môi trường thực tế, bạn có thể muốn thoát hoặc xử lý khác
    log_predictor = None

# --- Định nghĩa các route (URL) ---

@app.route('/')
def index():
    """Hiển thị trang chính để nhập log."""
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze_logs():
    """
    Endpoint nhận các dòng log từ frontend, phân tích và trả về kết quả.
    """
    if log_predictor is None:
        return jsonify({"error": "Model is not loaded. Application cannot process requests."}), 503

    data = request.get_json()
    log_lines = data.get('logs')

    if not log_lines or not isinstance(log_lines, list):
        return jsonify({"error": "Input must be a JSON object with a 'logs' key containing a list of strings."}), 400

    # Sử dụng predictor để phân tích
    try:
        predictions, probabilities = log_predictor.predict_from_logs(log_lines)
    except Exception as e:
        # Bắt các lỗi có thể xảy ra trong quá trình xử lý
        print(f"An error occurred during prediction: {e}")
        return jsonify({"error": "An internal error occurred while processing the logs."}), 500

    # Ghép kết quả lại với các dòng log gốc để trả về
    results = []
    for i in range(len(predictions)):
        results.append({
            "log_line": log_lines[i],
            "is_suspicious": int(predictions[i]),
            "suspicion_score": float(probabilities[i][1]) # Lấy xác suất của lớp 1 (suspicious)
        })

    return jsonify(results)



@app.route('/dashboard_data')
def get_dashboard_data():
    """
    Cung cấp dữ liệu đã được tổng hợp cho frontend dashboard.
    """
    db = get_db()
    
    # --- 1. Lấy các số liệu thống kê cho các thẻ (Cards) ---
    stats_cursor = db.execute('SELECT COUNT(id) as total, SUM(is_suspicious) as suspicious FROM processed_logs')
    stats_result = stats_cursor.fetchone()
    
    total_requests = stats_result['total'] if stats_result['total'] else 0
    suspicious_requests = stats_result['suspicious'] if stats_result['suspicious'] else 0
    
    # Định nghĩa "Warning" là các cuộc tấn công có độ tin cậy cao (ví dụ > 90%)
    warnings_count = db.execute(
        'SELECT COUNT(id) FROM processed_logs WHERE is_suspicious = 1 AND suspicion_score > 0.90'
    ).fetchone()[0]

    # Định nghĩa "System Health"
    system_health = "Healthy"
    if total_requests > 0:
        anomaly_rate = (suspicious_requests / total_requests) * 100
        if anomaly_rate > 5:
            system_health = "Critical"
        elif anomaly_rate > 1:
            system_health = "Warning"

    # --- 2. Lấy dữ liệu cho biểu đồ (Chart) ---
    # Lấy request trong 24 giờ qua, nhóm theo giờ
    traffic_data = db.execute('''
        SELECT
            strftime('%Y-%m-%d %H:00', timestamp) as hour,
            COUNT(id) as total,
            SUM(is_suspicious) as anomalies
        FROM processed_logs
        WHERE timestamp >= strftime('%Y-%m-%d %H:%M:%S', 'now', '-1 day')
        GROUP BY hour
        ORDER BY hour
    ''').fetchall()

    chart_labels = [row['hour'] for row in traffic_data]
    normal_traffic = [row['total'] - row['anomalies'] for row in traffic_data]
    anomalies_traffic = [row['anomalies'] for row in traffic_data]

    # --- 3. Lấy dữ liệu cho bảng (Table) ---
    recent_logs = db.execute('''
        SELECT ip, url, status, timestamp, suspicion_score, is_suspicious
        FROM processed_logs 
        ORDER BY id DESC 
        LIMIT 10
    ''').fetchall()

    # --- 4. Đóng gói dữ liệu thành JSON ---
    data = {
        'cards': {
            'total_requests': total_requests,
            'anomalies_detected': suspicious_requests,
            'warnings': warnings_count,
            'system_health': system_health
        },
        'chart': {
            'labels': chart_labels,
            'normal_data': normal_traffic,
            'anomalies_data': anomalies_traffic
        },
        'table': [dict(row) for row in recent_logs]
    }
    
    return jsonify(data)
    
@app.route('/process_log_line', methods=['POST'])
def process_log_line():
    """
    Nhận từng dòng log từ worker.py, phân tích & lưu vào DB.
    """
    if log_predictor is None:
        return jsonify({"error": "Model is not loaded."}), 503

    data = request.get_json()
    log_line = data.get('log_line')
    if not log_line:
        return jsonify({"error": "Missing log_line"}), 400

    # Gọi predictor để phân tích log
    try:
        predictions, probabilities = log_predictor.predict_from_logs([log_line])
        is_suspicious = int(predictions[0])
        suspicion_score = float(probabilities[0][1])
    except Exception as e:
        print(f"Error in prediction: {e}")
        return jsonify({"error": "Prediction error"}), 500

    # Lưu vào DB (bạn có thể tùy chỉnh cột cho đúng)
    # Parse log_line thành các trường riêng biệt
    try:
        parsed = parse_log_line(log_line)
    except Exception as e:
        print(f"Error parsing log: {e}")
        parsed = {}  # fallback nếu lỗi

    db = get_db()
    try:
        db.execute(
            """
            INSERT INTO processed_logs 
            (ip, timestamp, method, url, protocol, status, size, referrer, user_agent,
             label, suspicion_score, is_suspicious, log_line, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
            """,
            (
                parsed.get('ip'),
                parsed.get('timestamp'),
                parsed.get('method'),
                parsed.get('url'),
                parsed.get('protocol'),
                parsed.get('status'),
                parsed.get('size'),
                parsed.get('referrer'),
                parsed.get('user_agent'),
                None,  # label chưa có, để None
                suspicion_score,
                is_suspicious,
                log_line
            )
        )
        db.commit()
    except Exception as e:
        print(f"Error saving to DB: {e}")
        return jsonify({"error": "DB error"}), 500

    return jsonify({"result": "OK"})
# Mục setting  
@app.route('/api/settings', methods=['GET'])
def get_settings():
    return jsonify(load_settings())

@app.route('/api/settings', methods=['POST'])
def update_settings():
    new_settings = request.get_json()
    save_settings(new_settings)
    return jsonify({"status": "success"})
    
#  Chatbot    
@app.route('/ask', methods=['POST'])
def chatbot_ask():
    if chatbot is None:
        return jsonify({"error": "Chatbot is not available."}), 503

    data = request.get_json()
    question = data.get('question')
    user_id = data.get('userId')
    if not question:
        return jsonify({"error": "Question is missing or empty."}), 400

    try:
        answer = chatbot.get_answer(question)
        # Để frontend JS không lỗi, trả về kiểu này:
        return jsonify({"answer": {"answer": answer}})
    except Exception:
        return jsonify({"error": "An error occurred while processing your question."}), 500

@app.route('/upload', methods=['POST'])
def chatbot_upload():
    # TODO: Gắn code AI Chatbot xử lý ảnh ở đây!
    return jsonify({"answer": {"answer": "Chức năng upload chưa hỗ trợ!"}})
    
if __name__ == '__main__':
    # host='0.0.0.0' để có thể truy cập từ các máy khác trong cùng mạng
    # debug=True để tự động reload khi có thay đổi code (chỉ dùng khi phát triển)
    app.run(host='0.0.0.0', port=5000, debug=True)

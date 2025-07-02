# app.py

import os
import sqlite3
import pandas as pd
from flask import Flask, render_template, jsonify, request, g
import shap # THÊM DÒNG NÀY
import numpy as np # THÊM DÒNG NÀY

# Import class LogPredictor từ file predictor.py
from predictor import LogPredictor

# Import CÁC HÀM XỬ LÝ FEATURE TỪ CÁC FILE GỐC (để dùng trong route /explain)
from parsinglog import parse_nginx_log, NGINX_COMBINED_PATTERNS, strip_control
from feature_engineering import timestamp_features, status_features, referrer_features

# --- Cấu hình ứng dụng ---
APP_ROOT = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(APP_ROOT, 'catboost_model.joblib')

# ĐẢM BẢO CÁC DANH SÁCH NÀY KHỚP CHÍNH XÁC VỚI X_TRAIN.COLUMNS CỦA BẠN
MODEL_COLUMNS = ['method', 'protocol', 'status', 'size', 'hour_of_day', 'day_of_week', 'is_weekend', 
                 'part_of_day', 'hour_sin', 'hour_cos', 'day_of_week_sin', 'day_of_week_cos', 'time_since_last_event', 
                 'status_is_client_error', 'status_is_server_error', 'status_is_success', 'status_is_redirect',
                   'size_is_zero', 'referrer_len', 'referrer_entropy', 'referrer_is_empty', 'referrer_domain',
                     'referrer_is_external_or_valid']

CATEGORICAL_FEATURES = ['method', 'protocol', 'part_of_day', 'referrer_domain']


# --- Khởi tạo ứng dụng Flask ---
app = Flask(__name__)
DB_PATH = os.path.join(APP_ROOT, 'database', 'logs.db') # Đảm bảo đường dẫn đúng
app.config['DATABASE'] = DB_PATH

# Giữ nguyên các hàm database nếu bạn vẫn đang sử dụng chúng cho dashboard_data
# Đã thêm os.makedirs để đảm bảo thư mục database tồn tại
def get_db():
    if 'db' not in g:
        db_dir = os.path.dirname(app.config['DATABASE'])
        if not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)
            print(f"Created database directory: {db_dir}")

        g.db = sqlite3.connect(
            app.config['DATABASE'],
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row
    return g.db

def init_db():
    with app.app_context():
        db = get_db()
        cursor = db.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS processed_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                log_line TEXT NOT NULL,
                ip TEXT,
                url TEXT,
                status INTEGER,
                timestamp TEXT,
                is_suspicious INTEGER,
                suspicion_score REAL
            );
        ''')
        db.commit()
    print(f"Database initialized and ready at: {os.path.abspath(app.config['DATABASE'])}")


@app.teardown_appcontext
def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

# Khởi tạo LogPredictor
try:
    log_predictor = LogPredictor(
        model_path=MODEL_PATH,
        model_columns=MODEL_COLUMNS,
        cat_features=CATEGORICAL_FEATURES
    )
    # Khởi tạo SHAP Explainer và base_value TOÀN CỤC SAU KHI model được tải
    # Vì LogPredictor không còn khởi tạo SHAP nữa
    explainer = shap.TreeExplainer(log_predictor.model)
    
    expected_value = explainer.expected_value
    if isinstance(expected_value, np.ndarray):
        if expected_value.ndim == 0:
            base_value = float(expected_value) 
        elif expected_value.ndim == 1 and len(expected_value) > 1:
            base_value = float(expected_value[1])
        else:
            base_value = float(expected_value.flatten()[0]) if expected_value.size > 0 else 0.0
    elif isinstance(expected_value, (float, int)):
        base_value = float(expected_value)
    else:
        print(f"app.py (WARNING): Unexpected type for explainer.expected_value: {type(expected_value)}. Setting base_value to 0.0.")
        base_value = 0.0
    
    print(f"SHAP Explainer initialized globally. Global Base Value: {base_value}")

except FileNotFoundError as e:
    print(f"CRITICAL ERROR: {e}")
    print("Cannot start the application without the model file.")
    log_predictor = None
    explainer = None # Đảm bảo explainer cũng là None nếu model không tải được
    base_value = None

# --- Định nghĩa các route (URL) ---

@app.route('/')
def index():
    return render_template('index.html')

# Trong app.py

@app.route('/analyze', methods=['POST'])
def analyze_logs():
    if log_predictor is None:
        return jsonify({"error": "Model is not loaded. Application cannot process requests."}), 503

    data = request.get_json()
    log_lines = data.get('log_line') # Đã sửa ở bước trước, giữ nguyên

    if not log_lines or not isinstance(log_lines, list):
        # Sửa lại thông báo lỗi ở đây cho khớp
        return jsonify({"error": "Input must be a JSON object with a 'log_line' key containing a list of strings."}), 400

    try:
        predictions, probabilities = log_predictor.predict_from_logs(log_lines)

        # --- KIỂM TRA QUAN TRỌNG ---
        # Nếu không có dự đoán nào được tạo ra mặc dù có log đầu vào,
        # nghĩa là tất cả các dòng log đều không thể parse được.
        if not predictions and log_lines:
            print(f"WARNING: Could not parse any of the {len(log_lines)} log lines provided.")
            print(f"Received malformed lines: {log_lines}")
            return jsonify({
                "error": "None of the provided log lines could be parsed.",
                "failed_lines": log_lines
            }), 400
        # --- KẾT THÚC KIỂM TRA ---

    except Exception as e:
        print(f"An error occurred during prediction: {e}")
        return jsonify({"error": "An internal error occurred while processing the logs."}), 500

    results = []
    for i in range(len(predictions)):
        results.append({
            "log_line": log_lines[i],
            "is_suspicious": int(predictions[i]),
            "suspicion_score": float(probabilities[i][1])
        })

    return jsonify(results)


@app.route('/explain', methods=['POST'])
def explain_logs():
    """
    Endpoint nhận các dòng log thô, thực hiện feature engineering,
    tính toán SHAP values và trả về kết quả giải thích.
    """
    if log_predictor is None or explainer is None or base_value is None:
        return jsonify({"error": "Model or Explainer not loaded. Application cannot process requests."}), 503

    data = request.get_json()
    log_lines = data.get('log_line')

    if not log_lines or not isinstance(log_lines, list):
        return jsonify({"error": "Missing or invalid 'logs' in request body. It should be a list of strings."}), 400

    if len(log_lines) == 0:
        return jsonify({"error": "No log lines provided for explanation."}), 400

    # Chỉ giải thích log đầu tiên trong danh sách để đơn giản hóa cho Force Plot
    log_line_to_explain = log_lines[0] 

    try:
        # THỰC HIỆN LẠI CÁC BƯỚC PARSING VÀ FEATURE ENGINEERING TẠI ĐÂY
        # (Đây là sự lặp lại code, nhưng tuân thủ yêu cầu không sửa predictor.py)
        parsed_data = parse_nginx_log([log_line_to_explain], as_dataframe=True)
        if parsed_data.empty:
            return jsonify({"error": "Could not parse log line for explanation."}), 400

        # Áp dụng feature engineering
        df_featured = timestamp_features(parsed_data.copy())
        df_featured = status_features(df_featured.copy())
        df_featured = referrer_features(df_featured.copy())

        # Chuẩn bị DataFrame cuối cùng cho SHAP (đảm bảo cột khớp và đúng thứ tự)
        df_final_features = df_featured[MODEL_COLUMNS].copy()
        
        # Xử lý các cột bị thiếu (nếu có)
        missing_cols = set(MODEL_COLUMNS) - set(df_final_features.columns)
        for c in missing_cols:
            df_final_features[c] = 0 # Hoặc một giá trị mặc định hợp lý khác
        
        # Đảm bảo thứ tự cột
        df_final_features = df_final_features[MODEL_COLUMNS]

        # Tính toán SHAP values
        raw_shap_values = explainer.shap_values(df_final_features)
        
        shap_values_for_class_1 = []
        if isinstance(raw_shap_values, list) and len(raw_shap_values) == 2:
            shap_values_for_class_1 = raw_shap_values[1].tolist()
        elif isinstance(raw_shap_values, np.ndarray) and raw_shap_values.ndim == 2:
            shap_values_for_class_1 = raw_shap_values.tolist()
        else:
            print("Warning: Unexpected SHAP values structure in explain_logs. Cannot extract class 1 SHAP values.")
        
        feature_values_dict = df_final_features.iloc[0].to_dict()

        response_data = {
            "log_line": log_line_to_explain,
            "shap_values": shap_values_for_class_1[0] if shap_values_for_class_1 else [], # Lấy SHAP values cho log đầu tiên
            "base_value": base_value, # Sử dụng base_value toàn cục
            "feature_names": MODEL_COLUMNS, # Sử dụng MODEL_COLUMNS toàn cục
            "feature_values": feature_values_dict
        }
        return jsonify(response_data)

    except Exception as e:
        print(f"An error occurred during explanation: {e}")
        return jsonify({"error": f"Internal server error during explanation: {str(e)}"}), 500


@app.route('/dashboard_data')
def get_dashboard_data():
    # Giữ nguyên hàm này như bạn đã có
    db = get_db()
    
    stats_cursor = db.execute('SELECT COUNT(id) as total, SUM(is_suspicious) as suspicious FROM processed_logs')
    stats_result = stats_cursor.fetchone()
    
    total_requests = stats_result['total'] if stats_result['total'] else 0
    suspicious_requests = stats_result['suspicious'] if stats_result['suspicious'] else 0
    
    warnings_count = db.execute(
        'SELECT COUNT(id) FROM processed_logs WHERE is_suspicious = 1 AND suspicion_score > 0.90'
    ).fetchone()[0]

    system_health = "Healthy"
    if total_requests > 0:
        anomaly_rate = (suspicious_requests / total_requests) * 100
        if anomaly_rate > 5:
            system_health = "Critical"
        elif anomaly_rate > 1:
            system_health = "Warning"

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

    recent_anomalies = db.execute('''
        SELECT ip, url, status, timestamp, suspicion_score
        FROM processed_logs 
        WHERE is_suspicious = 1 
        ORDER BY id DESC 
        LIMIT 10
    ''').fetchall()

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
        'table': [dict(row) for row in recent_anomalies]
    }
    
    return jsonify(data)


if __name__ == '__main__':
    init_db() # Gọi hàm khởi tạo DB khi chạy ứng dụng
    app.run(host='0.0.0.0', port=8000, debug=True)

    
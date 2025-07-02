# worker.py (phiên bản gỡ lỗi và giải thích)
import time
import requests
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

LOG_FILE_PATH = "normal.log"
API_ENDPOINT = "http://127.0.0.1:8000/analyze"
EXPLAIN_API_ENDPOINT = "http://127.0.0.1:8000/explain" # NEW: Thêm endpoint cho lời giải thích
SUSPICION_EXPLANATION_THRESHOLD = 0.8 # NEW: Ngưỡng để yêu cầu giải thích (ví dụ: chỉ giải thích nếu điểm đáng ngờ >= 0.8)

class LogHandler(FileSystemEventHandler):
    def __init__(self):
        super().__init__()
        self.last_position = 0
        self.log_file_abs_path = os.path.abspath(LOG_FILE_PATH)
        
        print(f"Worker is now watching for changes to: {self.log_file_abs_path}")

        if os.path.exists(LOG_FILE_PATH):
            try:
                with open(LOG_FILE_PATH, 'r', encoding='utf-8') as f:
                    f.seek(0, 2)
                    self.last_position = f.tell()
                    print(f"Initial position for '{LOG_FILE_PATH}' set to the end of the file ({self.last_position} bytes).")
            except IOError as e:
                print(f"Could not initialize LogHandler: {e}")

    def on_modified(self, event):
        print(f"--- Event detected! Type: {event.event_type}, Path: {event.src_path} ---")
        
        event_abs_path = os.path.abspath(event.src_path)
        if event_abs_path == self.log_file_abs_path:
            print(f"MATCH: The changed file '{os.path.basename(event.src_path)}' is the one we are watching.")
            try:
                with open(LOG_FILE_PATH, 'r', encoding='utf-8') as f:
                    f.seek(self.last_position)
                    new_lines = f.readlines()
                    
                    if new_lines:
                        clean_lines = [line.strip() for line in new_lines if line.strip()]
                        
                        if clean_lines:
                            print(f"DETECTED NEW LOGS: {clean_lines}")
                            try:
                                # Gửi log đến server với key 'log_line' để phân tích
                                response = requests.post(API_ENDPOINT, json={'log_line': clean_lines})
                                
                                if 200 <= response.status_code < 300:
                                    analysis_results = response.json() # Nhận kết quả phân tích
                                    print(f"SUCCESS: Server responded with status {response.status_code}. Analysis Results: {analysis_results}")

                                    # NEW LOGIC: Kiểm tra từng dòng log đã phân tích
                                    for result in analysis_results:
                                        log_line = result.get('log_line')
                                        is_suspicious = result.get('is_suspicious')
                                        suspicion_score = result.get('suspicion_score', 0)

                                        # Nếu log là đáng ngờ và đạt ngưỡng điểm, yêu cầu giải thích
                                        if is_suspicious == 1 and suspicion_score >= SUSPICION_EXPLANATION_THRESHOLD:
                                            print(f"\n--- Highly Suspicious Log Detected ---")
                                            print(f"Log: '{log_line}'")
                                            print(f"Score: {suspicion_score:.4f}")
                                            print(f"Requesting explanation from {EXPLAIN_API_ENDPOINT}...")
                                            try:
                                                # Gửi log cụ thể này đến endpoint /explain
                                                explain_response = requests.post(EXPLAIN_API_ENDPOINT, json={'log_line': [log_line]})
                                                
                                                if 200 <= explain_response.status_code < 300:
                                                    explanation_data = explain_response.json()
                                                    print(f"EXPLANATION RECEIVED:")
                                                    print(f"  Base Value (Expected output without feature contributions): {explanation_data.get('base_value'):.4f}")
                                                    print(f"  Feature Contributions (Impact on Suspicion Score):")
                                                    
                                                    shap_values = explanation_data.get('shap_values', [])
                                                    feature_names = explanation_data.get('feature_names', [])
                                                    feature_values = explanation_data.get('feature_values', {})

                                                    # Ghép nối và sắp xếp theo độ lớn của tác động SHAP để dễ đọc
                                                    contributions = []
                                                    for i, name in enumerate(feature_names):
                                                        if i < len(shap_values):
                                                            contributions.append({
                                                                'feature': name,
                                                                'value': feature_values.get(name, 'N/A'),
                                                                'shap_contribution': shap_values[i]
                                                            })
                                                    
                                                    # Sắp xếp theo giá trị tuyệt đối của SHAP để thấy các đặc trưng quan trọng nhất trước
                                                    contributions.sort(key=lambda x: abs(x['shap_contribution']), reverse=True)
                                                    
                                                    for c in contributions:
                                                        print(f"    - {c['feature']} (Value: '{c['value']}'): {c['shap_contribution']:.4f}")
                                                    print("------------------------------------\n")
                                                else:
                                                    print(f"EXPLANATION ERROR: Server responded with status {explain_response.status_code}. Response Text: {explain_response.text}")
                                            except requests.exceptions.RequestException as e:
                                                print(f"EXPLANATION CRITICAL ERROR: Could not connect to API at {EXPLAIN_API_ENDPOINT}. Details: {e}")
                                        else:
                                            print(f"Log not suspicious enough for detailed explanation (Score: {suspicion_score:.2f}). Skipping explanation.")

                                else:
                                    print(f"ERROR: Server responded with status {response.status_code}. Response Text: {response.text}")

                            except requests.exceptions.RequestException as e:
                                print(f"CRITICAL ERROR: Could not connect to API at {API_ENDPOINT}. Details: {e}")

                    # Cập nhật vị trí con trỏ sau khi đọc
                    self.last_position = f.tell()
                    print(f"Updated file position to: {self.last_position}")

            except IOError as e:
                print(f"ERROR: Could not read log file: {e}")
        else:
            print(f"IGNORE: The changed file '{os.path.basename(event.src_path)}' is not '{LOG_FILE_PATH}'.")


def start_worker():
    print("LogLens Worker started. Watching for log changes...")
    
    if not os.path.exists(LOG_FILE_PATH):
        print(f"Log file '{LOG_FILE_PATH}' not found. Creating it.")
        open(LOG_FILE_PATH, 'a').close()

    event_handler = LogHandler()
    observer = Observer()
    observer.schedule(event_handler, path='.', recursive=False)
    
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping worker...")
        observer.stop()
    
    observer.join()
    print("Worker stopped.")

if __name__ == "__main__":
    start_worker()
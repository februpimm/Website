# loglens_app/worker.py
import time
import requests
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

LOG_FILE_PATH = "/var/log/nginx/access.log"
API_ENDPOINT = "http://127.0.0.1:5000/process_log_line" # Gọi API nội bộ

class LogHandler(FileSystemEventHandler):
    def __init__(self):
        super().__init__()
        self.last_position = 0
        # Di chuyển đến cuối file khi khởi động
        if os.path.exists(LOG_FILE_PATH):
            with open(LOG_FILE_PATH, 'r') as f:
                f.seek(0, 2)
                self.last_position = f.tell()

    def on_modified(self, event):
        if event.src_path == LOG_FILE_PATH:
            with open(LOG_FILE_PATH, 'r') as f:
                f.seek(self.last_position)
                new_lines = f.readlines()
                if new_lines:
                    for line in new_lines:
                        line = line.strip()
                        if line:
                            try:
                                # Gửi dòng log mới đến Flask API để xử lý và lưu
                                requests.post(API_ENDPOINT, json={'log_line': line})
                                print(f"Sent log for processing: {line}")
                            except requests.exceptions.RequestException as e:
                                print(f"Error sending log to API: {e}")
                    self.last_position = f.tell()

def start_worker():
    print("LogLens Worker started. Watching for log changes...")
    event_handler = LogHandler()
    observer = Observer()
    # Giám sát thư mục chứa file log
    observer.schedule(event_handler, path=os.path.dirname(LOG_FILE_PATH), recursive=False)
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

if __name__ == "__main__":
    # Đợi một chút để Flask server có thời gian khởi động
    time.sleep(5) 
    start_worker()
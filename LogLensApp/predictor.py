# predictor.py
import pandas as pd
import joblib
import os
from catboost import Pool

# Import các hàm bạn đã tạo từ các file khác
from parsinglog import parse_nginx_log
from feature_engineering import (
    timestamp_features,
    status_features,
    referrer_features,
)

class LogPredictor:
    def __init__(self, model_path: str, model_columns: list, cat_features:list):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at: {model_path}")
        
        self.model = joblib.load(model_path)
        self.model_columns = model_columns
        self.categorical_features = cat_features # Lưu lại

        print("LogPredictor initialized and model loaded successfully.")

    def _create_features(self, df_raw: pd.DataFrame) -> pd.DataFrame:
        df_featured = timestamp_features(df_raw)
        df_featured = status_features(df_featured)
        df_featured = referrer_features(df_featured)       
        return df_featured

    def predict_from_logs(self, log_lines: list[str]) -> tuple[list, list]:

        if not isinstance(log_lines, list):
            raise TypeError("Input `log_lines` must be a list of strings.")

        # 1. Parse các dòng log thô
        parsed_data = parse_nginx_log(log_lines, as_dataframe=True)
        if parsed_data.empty:
            print("Warning: No valid log lines could be parsed.")
            return [], []
        df_featured = self._create_features(parsed_data)

        # 2. Tạo features
        df_featured = self._create_features(parsed_data)

        # 3. Chuẩn bị dữ liệu cho model
        # Đảm bảo dữ liệu đầu vào có tất cả các cột mà model cần, điền 0 hoặc giá trị mặc định nếu thiếu
        missing_cols = set(self.model_columns) - set(df_featured.columns)
        for c in missing_cols:
            df_featured[c] = 0 # Hoặc một giá trị mặc định hợp lý khác
        
        # Sắp xếp các cột theo đúng thứ tự mà model đã học
        df_final = df_featured[self.model_columns]

        # 4. Tạo Pool và dự đoán
        predict_pool = Pool(df_final, cat_features=self.categorical_features)
        
        predictions = self.model.predict(predict_pool)
        probabilities = self.model.predict_proba(predict_pool)

        return predictions.tolist(), probabilities.tolist()
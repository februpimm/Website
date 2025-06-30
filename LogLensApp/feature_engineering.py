import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import re # regex
import numpy as np
from urllib.parse import urlparse, parse_qs # urlparse & parse_qs
from scipy.stats import entropy # Cho url_entropy ở

def timestamp_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Nhận vào một DataFrame chứa cột 'timestamp' và trả về DataFrame
    đã được bổ sung đầy đủ các feature về thời gian.
    """
    df['timestamp_dt'] = pd.to_datetime(df['timestamp'], format='%d/%b/%Y:%H:%M:%S %z', errors='coerce')
    
    df = df.sort_values('timestamp_dt').reset_index(drop=True)

    df['hour_of_day'] = df['timestamp_dt'].dt.hour
    df['day_of_week'] = df['timestamp_dt'].dt.dayofweek
    df['is_weekend'] = df['day_of_week'].apply(lambda x: 1 if x >= 5 else 0)

    def get_part_of_day(hour):
        if 5 <= hour < 12:
            return 'morning'
        elif 12 <= hour < 17:
            return 'afternoon'
        elif 17 <= hour < 21:
            return 'evening'
        else:
            return 'night'
    df['part_of_day'] = df['hour_of_day'].apply(get_part_of_day)

    df['hour_sin'] = np.sin(2 * np.pi * df['hour_of_day'] / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['hour_of_day'] / 24)
    df['day_of_week_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
    df['day_of_week_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
    
    df['time_since_last_event'] = df['timestamp_dt'].diff().dt.total_seconds().fillna(0)
    df.drop(columns=["timestamp_dt"], inplace=True)
    df.drop(columns=["timestamp"], inplace=True)

    return df




def status_features(df):

    # Kiểm tra cột trước
    if 'status' not in df.columns or 'size' not in df.columns:
        raise ValueError("DataFrame cần có cột 'status' và 'size'.")

    df = df.copy()
    df['status'] = pd.to_numeric(df['status'], errors='coerce').fillna(0).astype(int)
    df['size'] = pd.to_numeric(df['size'], errors='coerce').fillna(0).astype(int)
    # 1. 4xx - lỗi phía client
    df['status_is_client_error'] = df['status'].apply(lambda x: 1 if 400 <= x < 500 else 0)

    # 2. 5xx - lỗi phía server
    df['status_is_server_error'] = df['status'].apply(lambda x: 1 if 500 <= x < 600 else 0)

    # 3. Lỗi nói chung
    df['status_is_error'] = ((df['status_is_client_error'] == 1) | (df['status_is_server_error'] == 1)).astype(int)

    # 4. Thành công (2xx)
    df['status_is_success'] = df['status'].apply(lambda x: 1 if 200 <= x < 300 else 0)

    # 5. Redirect (3xx)
    df['status_is_redirect'] = df['status'].apply(lambda x: 1 if 300 <= x < 400 else 0)

    # 6. Response size bằng 0
    df['size_is_zero'] = df['size'].apply(lambda x: 1 if x == 0 else 0)

    return df


from urllib.parse import urlparse
def calculate_entropy(text_string: str) -> float:
    """
    Tính entropy của chuỗi ký tự (dựa trên xác suất xuất hiện ký tự).
    """
    import math
    from collections import Counter

    if not text_string:
        return 0.0

    counts = Counter(text_string)
    total = len(text_string)
    entropy = -sum((count / total) * math.log2(count / total) for count in counts.values())
    return entropy

def referrer_features(df):
    df = df.copy()
    
    df['referrer_len'] = df['referrer'].astype(str).apply(len)
    df['referrer_entropy'] = df['referrer'].astype(str).apply(calculate_entropy)
    df['referrer_is_empty'] = df['referrer'].apply(lambda x: 1 if x == '-' or pd.isna(x) or str(x).strip() == '' else 0)

    def get_referrer_domain(ref):
        ref_str = str(ref)
        if pd.isna(ref) or ref_str == '-' or not ref_str.startswith('http'):
            return 'none'
        try:
            parsed = urlparse(ref_str)
            return parsed.netloc.lower() if parsed.netloc else 'unknown_format_but_not_empty'
        except:
            return 'parse_error'

    df['referrer_domain'] = df['referrer'].apply(get_referrer_domain)
    df['referrer_is_external_or_valid'] = df['referrer_domain'].apply(
        lambda x: 0 if x in ['none', 'parse_error', 'unknown_format_but_not_empty'] else 1
    )

    return df


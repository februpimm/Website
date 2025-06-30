import re
from typing import Union, Iterable, List, Dict, Optional
import pandas as pd

# ──────────────────────────────────────────────────────────────
# 1) Pre-compile regex (Nginx / Apache “combined” format)
#    - STRICT   : có dấu " quanh request + referrer + user-agent
#    - FALLBACK : thiếu hoặc hỏng dấu " (bắt thoáng hơn)
# ──────────────────────────────────────────────────────────────
NGINX_REGEX_STRICT = re.compile(
    r'(?P<ip>\S+)\s+-\s+-\s+'                              # IP - -
    r'\[(?P<timestamp>[^\]]+)]\s+'                         # [timestamp]
    r'"(?P<method>[A-Z]+)\s+'                              # "METHOD␣
    r'(?P<url>.+?)\s+'                                     # URL (non-greedy)
    r'(?P<protocol>[A-Z]+/\d(?:\.\d)?)"\s+'                # PROTOCOL"
    r'(?P<status>\d{3}|-)\s+'                              # status
    r'(?P<size>\d+|-)\s+'                                  # size
    r'"(?P<referrer>[^"]*)"\s+'                            # "referrer"
    r'"(?P<user_agent>[^"]*)"'                            # "user-agent"
    r'(?:[ \t]+(?P<label>[01]))?$',        #  ← thêm nhóm label tuỳ chọn
    flags=re.IGNORECASE,
)

NGINX_REGEX_FALLBACK = re.compile(
    r'(?P<ip>\S+)\s+-\s+-\s+'                              # IP - -
    r'\[(?P<timestamp>[^\]]+)]\s+'                         # [timestamp]
    r'(?P<method>[A-Z]+)\s+'                               # METHOD
    r'(?P<url>.+?)\s+'                                     # URL
    r'(?P<protocol>[A-Z]+/\d(?:\.\d)?)\s+'                 # PROTOCOL
    r'(?P<status>\d{3}|-)\s+'                              # status
    r'(?P<size>\d+|-)\s+'                                  # size
    r'(?P<referrer>\S+|-)\s+'                              # referrer (không quotes)
    r'(?P<user_agent>.+)'                                 # user-agent (còn lại)
    r'(?:[ \t]+(?P<label>[01]))?$',        #  ← thêm nhóm label tuỳ chọn

    flags=re.IGNORECASE,
)

# Gộp thành tuple để lần lượt thử
NGINX_COMBINED_PATTERNS = (NGINX_REGEX_STRICT, NGINX_REGEX_FALLBACK)

# ──────────────────────────────────────────────────────────────
# 2) Tiện ích: loại bỏ ký tự control (nếu log bị lẫn \x00 …)
# ──────────────────────────────────────────────────────────────
def strip_control(s: str) -> str:
    """Remove leading control chars (0x00–0x1F) ở đầu dòng."""
    return re.sub(r'^[\x00-\x1F]+', "", s)

# ──────────────────────────────────────────────────────────────
# 3) Hàm wrapper parse_nginx_log
# ──────────────────────────────────────────────────────────────
def parse_nginx_log(
    source: Union[str, Iterable[str]],
    patterns: Iterable[re.Pattern] = NGINX_COMBINED_PATTERNS,
    as_dataframe: bool = True,
    encoding: Optional[str] = "utf-8",
) -> Union[pd.DataFrame, List[Dict[str, str]]]:
    """
    Parse log Nginx / Apache (combined) thành list[dict] hoặc pandas.DataFrame.

    Args:
        source (str | Iterable[str]):
            • Chuỗi đường dẫn file, hoặc
            • Iterable (list, generator, ...) các dòng log.
        patterns (Iterable[re.Pattern]): Danh sách regex sẽ thử lần lượt.
        as_dataframe (bool): True -> trả về DataFrame, False -> list[dict].
        encoding (str | None): Encoding khi mở file (nếu source là path).

    Returns:
        pandas.DataFrame | list[dict]
    """
    # 1) Lấy iterator dòng log
    if isinstance(source, str):                # truyền path
        fh = open(source, "r", encoding=encoding, errors="replace")
        lines = fh
        close_file = True
    else:                                      # iterable dòng
        lines = source
        close_file = False

    # 2) Parse
    parsed: List[Dict[str, str]] = []
    for raw_line in lines:
        line = strip_control(raw_line.rstrip("\n"))
        for pat in patterns:
            m = pat.match(line)
            if m:
                parsed.append(m.groupdict())
                break                          # matched → sang dòng kế
        # nếu muốn ghi lại MISS, thêm else: missed.append(line)

    # 3) Đóng file nếu cần
    if close_file:
        fh.close()

    # 4) Trả kết quả
    return pd.DataFrame(parsed) if as_dataframe else parsed

log_line_to_test = '108.90.232.102 - - [19/Jul/2024:07:24:21 +0000] "PUT /view?file=php://filter/convert.base64-encode/resource=index.php HTTP/1.0" 403 3575 "http://evil.com" "sqlmap/1.4.12.1#dev"'

parsed_result = parse_nginx_log([log_line_to_test], as_dataframe=True)

if not parsed_result.empty:
    print("Parse successful!")
    print(parsed_result.to_dict('records'))
else:
    print("Parse FAILED!")
def parse_log_line(log_line: str) -> dict:
    """
    Parse 1 dòng log thành dict các trường (ip, timestamp, method, url, ...).
    Nếu không parse được, trả về dict rỗng.
    """
    result = parse_nginx_log([log_line], as_dataframe=False)
    if result and isinstance(result, list):
        return result[0]
    return {}

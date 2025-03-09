from dotenv import load_dotenv
import os
import time
import requests
import json
import pandas as pd

# .env 파일 로드
load_dotenv()

# Aladin API 키 가져오기
ALADIN_API_KEY = os.environ.get("ALADIN_API_KEY")

def check_api_key(api_key):
    if not api_key:
        raise ValueError("ALADIN API 키가 설정되지 않았습니다.")

def fetch_aladin_data(api_key, query_type="Bestseller", start=1, max_results=50, output="js"):
    """
    Aladin API로 데이터를 요청하고 JSON 데이터를 반환.
    """
    url = 'http://www.aladin.co.kr/ttb/api/ItemList.aspx'
    params = {
        "ttbkey": api_key,
        "QueryType": query_type,
        "SearchTarget": "Book",
        "Start": start,
        "MaxResults": max_results,
        "Output": output,
        "Version": "20131101"
    }

    for _ in range(5):  # 최대 5번 재시도
        try:
            response = requests.get(url, params=params)
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 429:  # Rate Limit 초과
                print(f"Rate limit exceeded. 재시도 중...")
                time.sleep(5)  # 5초 대기 후 재시도
            else:
                print(f"API 요청 실패: {response.status_code}")
                print(response.text)
                break
        except requests.RequestException as e:
            print(f"요청 중 오류 발생: {e}")
            break
    return None

def json_to_dataframe(data):
    if data and 'item' in data:
        return pd.DataFrame(data['item'])
    print("데이터에 'item' 키가 없거나 데이터가 비어 있습니다.")
    return pd.DataFrame()

def filter_columns(df, columns):
    if not df.empty:
        return df[columns]
    print("DataFrame이 비어 있어 필터링할 수 없습니다.")
    return pd.DataFrame()

# df_aladin 생성
columns = ['title', 'itemId', 'isbn', 'isbn13', 'link', 'author', 'description', 'pubDate', 'cover', 
           'categoryName', 'publisher', 'customerReviewRank', 'bestRank']

try:
    check_api_key(ALADIN_API_KEY)
    raw_data = fetch_aladin_data(ALADIN_API_KEY)
    df = json_to_dataframe(raw_data)
    df_aladin = filter_columns(df, columns)
except ValueError as e:
    print(e)

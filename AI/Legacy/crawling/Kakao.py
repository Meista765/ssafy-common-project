import os
import time
import requests
import pandas as pd
from dotenv import load_dotenv
from Aladin import df_aladin

# .env 파일 로드
load_dotenv()

# API 키 가져오기
KAKAO_API_KEY = os.environ.get("KAKAO_API_KEY")

def check_api_key(api_key):
    if not api_key:
        raise ValueError("KAKAO API 키가 설정되지 않았습니다.")

def get_book_data_from_kakao(isbn_list, api_key):
    """
    Kakao API를 사용하여 ISBN 목록에 대한 책 정보를 가져옴.
    """
    check_api_key(api_key)

    url = "https://dapi.kakao.com/v3/search/book"
    headers = {"Authorization": f"KakaoAK {api_key}"}
    contents_list = []

    for isbn in isbn_list:
        params = {"target": "isbn", "query": isbn}
        for _ in range(5):  # 최대 5번 재시도
            try:
                response = requests.get(url, headers=headers, params=params)
                if response.status_code == 200:
                    data = response.json()
                    if 'documents' in data and len(data['documents']) > 0:
                        contents_list.extend([doc['contents'] for doc in data['documents']])
                    break
                elif response.status_code == 429:  # Rate Limit 초과
                    print(f"Rate limit exceeded for ISBN {isbn}. 재시도 중...")
                    time.sleep(5)  # 5초 대기 후 재시도
                else:
                    print(f"ISBN {isbn} 요청 실패: {response.status_code}")
                    print(response.text)
                    break
            except requests.RequestException as e:
                print(f"요청 중 오류 발생: {e}")
                break
    return contents_list

def create_kakao_contents_df(isbn_list, api_key):
    contents_list = get_book_data_from_kakao(isbn_list, api_key)
    return pd.DataFrame(contents_list, columns=['KAKAO_contents'])

def get_isbn_list(df):
    return df['isbn13'].tolist()

# df_kakao 생성
isbn_list = get_isbn_list(df_aladin)
df_kakao = create_kakao_contents_df(isbn_list, KAKAO_API_KEY)

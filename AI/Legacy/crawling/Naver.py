import os
import time
import requests
import xml.etree.ElementTree as ET
import pandas as pd
from dotenv import load_dotenv
from Aladin import df_aladin

# .env 파일 로드
load_dotenv()

# Naver API 클라이언트 정보 가져오기
NAVER_CLIENT_ID = os.environ.get("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.environ.get("NAVER_CLIENT_SECRET")

def check_naver_api_credentials(client_id, client_secret):
    if not client_id or not client_secret:
        raise ValueError("NAVER API 클라이언트 정보가 설정되지 않았습니다.")

def get_naver_book_descriptions(isbn_list, client_id, client_secret):
    """
    Naver API를 사용하여 ISBN 목록에 대한 책 설명을 가져옴.
    """
    check_naver_api_credentials(client_id, client_secret)

    url = "https://openapi.naver.com/v1/search/book_adv.xml"
    headers = {
        "X-Naver-Client-Id": client_id,
        "X-Naver-Client-Secret": client_secret
    }

    descriptions = []

    for isbn in isbn_list:
        params = {
            "d_isbn": isbn,  # ISBN 검색어
            "display": 10,   # 한 번에 가져올 결과 수
            "start": 1       # 검색 시작 위치
        }

        for _ in range(5):  # 최대 5번 재시도
            try:
                response = requests.get(url, headers=headers, params=params)
                if response.status_code == 200:
                    # XML 파싱
                    root = ET.fromstring(response.text)
                    for item in root.findall('.//item'):
                        description = item.find('description').text if item.find('description') is not None else ""
                        descriptions.append(description)
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
    return descriptions

def create_naver_description_df(isbn_list, client_id, client_secret):
    descriptions = get_naver_book_descriptions(isbn_list, client_id, client_secret)
    return pd.DataFrame(descriptions, columns=["Naver_description"])

def get_isbn_list(df):
    return df['isbn13'].tolist()

# df_naver 생성
isbn_list = get_isbn_list(df_aladin)
df_naver = create_naver_description_df(isbn_list, NAVER_CLIENT_ID, NAVER_CLIENT_SECRET)

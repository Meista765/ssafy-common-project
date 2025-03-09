import pandas as pd
from Aladin import df_aladin  # Aladin에서 가져온 데이터
from Kakao import df_kakao  # Kakao에서 가져온 데이터
from Naver import df_naver  # Naver에서 가져온 데이터

def merge_book_data(df_books, df_kakao, df_naver):
    """
    Aladin, Kakao, Naver의 데이터를 병합하여 최종 DataFrame 생성.
    """
    # 병합 전에 데이터가 비어있지 않은지 확인
    if df_books.empty or df_kakao.empty or df_naver.empty:
        raise ValueError("병합할 데이터프레임 중 하나가 비어 있습니다.")
    
    # DataFrame 병합 (같은 행수라고 가정)
    df_books_filtered = pd.concat([df_books[['title', 'description', 'itemId']], df_kakao, df_naver], axis=1)
    
    return df_books_filtered

def save_to_csv(df, filename):
    """
    최종 DataFrame을 CSV 파일로 저장.
    """
    df.to_csv(f'data/{filename}', index=False, encoding='utf-8-sig')
    print(f"{filename} 파일이 성공적으로 저장되었습니다.")

if __name__ == "__main__":
    try:
        # Aladin, Kakao, Naver 데이터 병합
        final_df = merge_book_data(df_aladin, df_kakao, df_naver)
        
        # CSV 파일로 저장
        save_to_csv(final_df, "book_crawling_data.csv")
    except ValueError as e:
        print(f"오류 발생: {e}")

import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate

# 1. 환경변수 로드 및 OPENAI_API_KEY 가져오기
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# 2. ChatOpenAI 모델 초기화
llm = ChatOpenAI(openai_api_key=OPENAI_API_KEY, model="gpt-4o-mini")

# 3. PromptTemplate 객체 생성 (모든 입력값을 조건문으로 처리)
characters_prompt_template = PromptTemplate(
    input_variables=["genre", "title", "worldview", "synopsis", "characters"],
    template="""
    <역할>
    당신은 작품 표지를 만드는 디자이너를 도와주는 인공지능입니다.
    주어진 소설 장르, 제목, 세계관, 줄거리, 등장인물 정보를 바탕으로 소설의 표지를 디자인하기 위한 키워드를 추천해야 합니다.

    <목표>
    소설 정보에 맞는 3~4가지의 적절한 키워드를 추천합니다.

    <작성 지침>
    - ㅇㅇ

    <입력 정보>
    소설 장르: { genre }
    소설 제목: { title }
    소설 세계관: { worldview }
    소설 줄거리: { synopsis }
    소설 등장인물: { characters }

    <예시>
    - 소설 장르: 판타지, 액션, 일상물
    - 소설 제목: 괴식 식당
    - 소설 세계관: "괴식식당"은 일상적인 현대사회 혹은 근미래와 유사한 배경 위에, 공포, 스릴러적 분위기를 조성하는 기이한 식당을 중심으로 전개된다. 일반인에게는 잘 알려지지 않았거나 존재 자체가 불분명한 이 식당은, 전통적인 식재료로는 이해하기 힘든 괴이한 재료들을 사용
    - 소설 줄거리:
    - 소설 등장인물:

    **소설 등장인물 추천**
    """
    )

# 4. PromptTemplate과 ChatOpenAI를 체인으로 연결
recommend_characters_chain = characters_prompt_template | llm

# 5. 사용자 입력 받기 (모든 항목을 선택 사항으로 처리)
input_genre = input("소설 장르를 입력하세요 (없으면 엔터키): ")
input_title = input("소설 제목을 입력하세요 (없으면 엔터키): ")
input_worldview = input("소설 세계관을 입력하세요 (없으면 엔터키): ")
input_synopsis = input("소설 줄거리를 입력하세요 (없으면 엔터키): ")
input_characters = input("소설 등장인물을 입력하세요 (없으면 엔터키): ")

input_json = {
    "genre": input_genre.strip(),
    "title": input_title.strip(),
    "worldview": input_worldview.strip(),
    "synopsis": input_synopsis.strip(),
    "characters": input_characters.strip()
}

# 6. langchain 체인 실행
recommend_characters = recommend_characters_chain.invoke(input_json)

# 7. 결과 출력
print(f"추천 등장인물 정보:\n{recommend_characters.content}")

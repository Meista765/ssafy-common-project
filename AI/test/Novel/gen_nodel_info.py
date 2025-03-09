import json
from NovelGenerator import NovelGenerator

# 1️⃣ 사용자 입력 받기
genre = input("소설의 장르를 입력하세요 (예: 판타지, 로맨스, 스릴러 등): ")
title = input("소설의 제목을 입력하세요 (예: 괴식식당, 신의탑, 전생전기 등): ")

# 2️⃣ NovelGenerator 객체 생성
novel_gen = NovelGenerator(genre, title)

# 3️⃣ 소설 정보 생성
print("🌍 세계관 생성 중...")
worldview = novel_gen.recommend_worldview()

print("📜 줄거리 생성 중...")
synopsis = novel_gen.recommend_synopsis()

print("🎭 등장인물 생성 중...")
characters = novel_gen.recommend_characters()

# 4️⃣ JSON 파일로 저장
novel_info = {
    "genre": genre,
    "style": "watercolor",  # 기본 스타일 설정 (원하는 스타일로 변경 가능)
    "title": title,
    "worldview": worldview,
    "keywords": characters.split("\n")[:5]  # 등장인물 리스트에서 5개 키워드 추출
}

with open("generated_info.json", "w", encoding="utf-8") as f:
    json.dump(novel_info, f, ensure_ascii=False, indent=4)

print("✅ 소설 정보가 generated_info.json에 저장되었습니다.")

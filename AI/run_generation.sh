#!/bin/bash

# 1️⃣ 소설 정보 생성 및 저장
echo "🚀 소설 정보를 생성 중..."
python ./test/Novel/gen_nodel_info.py

# 2️⃣ JSON 파일이 정상적으로 생성되었는지 확인
if [ ! -f generated_info.json ]; then
    echo "❌ 소설 정보 생성 실패! JSON 파일을 찾을 수 없습니다."
    exit 1
fi

echo "✅ 소설 정보가 generated_info.json에 저장되었습니다."

# 3️⃣ FastAPI 서버에 이미지 생성 요청
echo "🎨 이미지 생성 요청 중..."
URL="http://70.12.130.111:8888/api/v1/editor/image_ai"

RESPONSE=$(curl -X POST "$URL" \
     -H "Content-Type: application/json" \
     -d "@generated_info.json" \
     --output ./generated_image.png --silent --write-out "%{http_code}")

# 4️⃣ 응답 코드 확인
if [ "$RESPONSE" -eq 200 ]; then
    echo "✅ 이미지 생성 성공! 저장된 파일: generated_image.png"
else
    echo "❌ 이미지 생성 실패! 응답 코드: $RESPONSE"
    exit 1
fi

# 5️⃣ 생성된 이미지 띄우기
python3 show_image.py

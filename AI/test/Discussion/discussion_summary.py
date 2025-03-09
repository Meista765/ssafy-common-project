import os
import json
from dotenv import load_dotenv

# 환경변수 로드 및 GEMINI_API_KEY 가져오기
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

import google.generativeai as genai

genai.configure(api_key=GEMINI_API_KEY)

instruction = """
당신은 회의록을 분석하여 주요 논의사항과 아이디어를 요약하고, 추가적인 분석을 제안하는 전문가입니다.
생성되는 텍스트는 순수한 일반 텍스트 형식이어야 하며, 어떠한 마크다운 문법(예: **, ## 등)도 사용하지 말아주세요.
발언자의 역할과 발언 순서(가능하다면 시간 정보 포함)를 고려하여 대화의 흐름과 주요 아이디어를 효과적으로 도출해 주세요.

아래의 세 가지 항목으로 요약본을 작성해 주세요:

1. 주요 논의사항
   - 회의에서 다뤄진 주요 주제나 토론 내용을 간략하게 나열합니다.
   - 발언자와 시간 순서(또는 발언 순서)가 드러나도록 핵심 발언들을 중심으로 정리합니다.

2. 회의에서 유저에 의해 발생한 핵심 아이디어
   - 회의 참여자가 제시한 핵심 아이디어나 독창적인 의견을 정리합니다.

3. 회의록을 바탕으로 AI가 분석한 아이디어 제안
   - 회의 내용을 기반으로 추가적인 개선점이나 대안, 또는 토론되지 않은 관점에 대한 AI의 심층 분석을 제안합니다.
   - 논의의 미비점이나 보완할 점을 구체적으로 작성합니다.
   - 회의 내용을 기반으로 AI가 추가로 제안하는 아이디어나 개선점을 구체적으로 작성합니다.

아래 회의록을 참고하여 위와 같은 형식의 요약본을 작성해 주세요.
양식은 예시와 똑같이 따라주시기 바랍니다.
아래는 예시입니다:

### 주요 논의 사항
* 리나의 첨지 만남 동기에 대한 분석 및 관련 문학적 상징 해석  
* 현진건 작가의 '운수 좋은 날'과의 연관성 토론 및 등장인물 심리 분석  
* 시간여행 설정의 개연성 검토와 소설 내 상징적 의미 분석  

### 회의에서 유저에 의해 발생한 핵심 아이디어
* 과거 인물과의 만남 모티브와 소설의 역사적 배경 연결  
* 시간여행 장치의 의미와 문학적 상징성에 대한 토론  

### 회의록을 바탕으로 AI가 분석한 아이디어 제안
```
### 시간여행의 규칙 체계화 및 문학적 해석 보완
- 소설 내 시간여행의 역할과 규칙, 그리고 등장인물의 내면적 갈등을 보다 명확히 해석할 수 있는 방안 제안  
    * 시간여행은 특정 조건에서만 가능하도록 설정하여 극의 긴장감 증가  
    * 과거 변경 시 발생하는 부작용 및 상징적 의미 부여  
    * 시간여행 횟수/기간 제한을 통해 내러티브의 일관성 확보
```
```
- 시간여행 장치와 역사적 인물 상호작용을 통한 심리적 내러티브 확장
    * 시간여행의 조건과 한계 설정
    * 역사적 인물과의 상호작용
    * 내면적 갈등 및 문학적 상징 강화
```
"""

model = genai.GenerativeModel(
    "models/gemini-2.0-flash", 
    system_instruction=instruction
)

# JSON 파일로부터 회의록 데이터를 읽어오기
json_file_path = "stt_json/meeting_20250213_111236_listener.json"
with open(json_file_path, "r", encoding="utf-8") as json_file:
    data = json.load(json_file)

# "messages" 리스트에서 각 메시지를 "주체자: 대화내용" 형식으로 변환
discussion_minutes = "\n".join([
    f'{msg["user"]}: {msg["text"]}' for msg in data.get("messages", [])
])

prompt = f"""
## 회의록 내용:
{discussion_minutes}

**회의록 요약**
"""

response = model.generate_content(prompt)
print(response.text)

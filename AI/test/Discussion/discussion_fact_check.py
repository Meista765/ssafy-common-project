import os
from dotenv import load_dotenv
from langchain.chat_models import ChatOpenAI
from langchain.prompts import PromptTemplate

# 1. 환경변수 로드 및 OPENAI_API_KEY 가져오기
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# 2. gpt-4o-mini 모델 초기화 (온도와 최대 토큰 수를 설정하여 결과 조정)
llm = ChatOpenAI(
    openai_api_key=OPENAI_API_KEY,
    model="gpt-4o-mini",
    temperature=0.7,
    max_tokens=1024
)

# 3. 회의록 요약을 위한 PromptTemplate 객체 생성
meeting_summary_template = PromptTemplate(
    input_variables=["meeting_minutes"],
    template="""
당신은 회의록 요약 전문가입니다.
주어진 회의록을 분석하여 아래의 세 가지 항목으로 요약본을 작성해 주세요.

1. **주요 논의사항**
   - 회의에서 다뤄진 주요 주제나 토론 내용을 간략하게 나열합니다.

2. **회의에서 유저에 의해 발생한 핵심 아이디어**
   - 회의 참여자가 제시한 핵심 아이디어나 독창적인 의견을 정리합니다.

3. **회의록을 바탕으로 AI가 분석한 아이디어 제안**
   - 회의 내용을 기반으로 AI가 추가로 제안하는 아이디어나 개선점을 구체적으로 작성합니다.

아래는 예시입니다:

주요 논의 사항
* 리나의 첨지 만남 동기에 대한 분석
* 현진건 작가의 '운수 좋은 날'과의 연관성 토론
* 시간여행 설정의 개연성 검토

회의에서 유저에 의해 발생한 핵심 아이디어
* 과거 인물과의 만남 모티브
* 시간여행 장치의 의미

회의록을 바탕으로 AI가 분석한 아이디어 제안
**시간여행의 규칙 체계화**
- 리나의 시간여행에 대한 명확한 규칙과 제약을 설정하여 이야기의 개연성을 높일 수 있습니다.
* 시간여행은 특정 조건에서만 가능
* 과거 변경 시 발생하는 부작용 설정
* 시간여행 횟수/기간 제한

아래 회의록을 참고하여 위와 같은 형식의 요약본을 작성해 주세요.

회의록:
{{ meeting_minutes }}
"""
)

# 4. PromptTemplate과 ChatOpenAI를 체인으로 연결
recommend_summary_chain = meeting_summary_template | llm

# 5. 사용자로부터 회의록 입력 받기
input_minutes = input("회의록을 입력하세요: ").strip()

input_json = {
    "meeting_minutes": input_minutes
}

# 6. langchain 체인 실행하여 요약본 생성
summary_result = recommend_summary_chain.invoke(input_json)

# 7. 결과 출력
print("생성된 회의록 요약:")
print(summary_result.content)

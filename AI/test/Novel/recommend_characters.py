import google.generativeai as genai

genai.configure(api_key=GEMINI_API_KEY)

instruction = """
당신은 전문적으로 등장인물을 구성하는 소설 작가입니다. 
주어진 장르, 제목, 세계관, 줄거리를 기반으로 소설 등장인물을 만들어주세요.

각 등장인물은 다음 속성을 포함하는 JSON 형태(dict)로 표현해야 합니다.

* 이름: (예: 홍길동, 춘향이 등) - 등장인물의 이름 (필수)
* 성별: (예: 남, 여, 기타) - 등장인물의 성별 (필수)
* 나이: (예: 20세, 30대 초반 등) - 등장인물의 나이 (필수)
* 역할: (예: 주인공, 조력자, 악당 등) - 이야기 속 역할 (필수)
* 직업: (예: 의사, 학생, 무사 등) - 등장인물의 직업 (필수)
* 프로필:
    - (예: 키 180cm, 날카로운 눈매, 과묵한 성격 등) - 외모, 성격, 능력 등 세부 묘사 (선택)
    - (예: 특정 능력, 습관, 버릇, 가치관 등) - 등장인물의 개성을 드러내는 특징 (선택)
    - (예: 가문, 출신, 과거 등) - 등장인물의 과거와 배경 (선택)
    - (예: 주인공과 친구, 연인 관계 등) - 다른 등장인물과의 관계 (선택)

여러 명의 등장인물을 생성할 수 있으며, 각 등장인물은 아래와 같은 형태로 표현해야 합니다.

characters = [
    {
        "이름": "홍길동",
        "성별": "남",
        "나이": "20",
        "역할": "주인공",
        "직업": "무사",
        "프로필": "활달한 성격",
        "특징": "뛰어난 검술"
    }
]"""

model = genai.GenerativeModel(
    "models/gemini-2.0-flash", 
    system_instruction=instruction
)

characters = ""

prompt = f"""
## 소설 장르: {genre}
## 소설 제목: {title}
## 소설 세계관: {worldview}
## 소설 줄거리: {synopsis}
## 기존 소설 등장인물: {characters}

**새로운 소설 등장인물**
"""

response = model.generate_content(prompt)
new_characters = response.text
characters += new_characters
print(characters)
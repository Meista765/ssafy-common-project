import google.generativeai as genai

genai.configure(api_key=GEMINI_API_KEY)

instruction = """당신은 창의적이고 독창적인 소설 작가입니다. 
주어진 장르, 제목, 세계관, 줄거리, 등장인물, 소설 이전화를 기반으로 소설의 다음화를 작성해야 합니다.
장르의 분위기에 맞게 전개하되, 500-1000자 정도의 내용을 작성해야 합니다."""

model = genai.GenerativeModel(
    "models/gemini-2.0-flash", 
    system_instruction=instruction
)

prompt = f"""
## 소설 장르: {genre}
## 소설 제목: {title}
## 소설 세계관: {worldview}
## 소설 줄거리: {synopsis}
## 소설 등장인물: {characters}
## 소설 초안: {first_chapter}

**소설 다음화**
"""

response = model.generate_content(prompt)
next_chapter = response.text
print(next_chapter)

# from sqlalchemy.orm import Session
# from models import Episode, Novel
import os
from dotenv import load_dotenv
import google.generativeai as genai
import json, re

from typing import List, Dict

class NovelGenerator:
    def __init__(
            self,
            genre: str,
            title: str,
            worldview: str = "",
            synopsis: str = "",
            summary : str = "",
            characters: List[Dict] = [],
            previous_chapters: str = "",
    ):
        # 환경변수 로드 및 API 키 설정
        load_dotenv()
        self.GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
        genai.configure(api_key=self.GEMINI_API_KEY)

        # 기본 정보 초기화
        self.genre = genre
        self.title = title
        self.worldview = worldview
        self.synopsis = synopsis
        self.summary = summary
        self.characters = characters
        self.previous_chapters = previous_chapters

    def recommend_worldview(self) -> str:
        """소설 세계관 생성 함수"""
        instruction = """
        당신은 전문적으로 소설 세계관을 만드는 작가입니다.
        생성되는 텍스트는 순수한 일반 텍스트 형식이어야 하며, 어떠한 마크다운 문법(예: **, ## 등)도 사용하지 말아주세요.
        주어진 장르, 제목을 기반으로 독창적이고 생동감 있는 소설 세계관을 만들어주세요.
        소설 세계관을 구성할 때, 아래의 항목들을 참고하여 상세하게 작성하세요.

        1. 기본 설정
            - 시대: (예: 과거, 현대, 미래 등) - 시대적 배경과 분위기를 구체적으로 설명해주세요.
            - 핵심 테마: (예: 인간과 자연의 대립, 기술과 마법의 공존 등) - 세계관을 관통하는 핵심 주제를 명확히 제시하고, 다른 요소들과의 연관성을 설명해주세요.

        2. 지리적 배경
            - 세계 전체의 구조(대륙, 국가, 도시, 마을 등) - 지리적 구조를 시각적으로 표현하고, 각 지역의 특징을 설명해주세요.
            - 주요 지형 및 자연 환경(기후, 산맥, 강 등) - 자연 환경이 세계관에 미치는 영향을 설명하고, 상징적인 의미를 부여할 수 있습니다.
            - 상징적이거나 중요한 장소(예: 전설적인 성, 신비로운 숲 등) - 각 장소의 역사, 특징, 중요성 등을 구체적으로 설명해주세요.

        3. 역사와 문화
            - 세계의 건국 신화 및 주요 역사적 사건 - 역사적 사건이 세계관에 미친 영향과 현재 사회에 남은 유산을 설명해주세요.
            - 사회 구조(정치 체제, 경제 시스템, 계층 구조 등) - 사회 구조가 세계관 구성원들의 삶에 미치는 영향을 설명해주세요.
            - 문화와 종교(전통, 의식, 종교적 신념 등) - 문화와 종교가 세계관에 미치는 영향을 설명하고, 독특한 요소들을 강조해주세요.

        4. 기술 및 초자연적 요소
            - 세계 내 기술 수준(과거, 현대, 미래 기술) - 기술 수준이 세계관에 미치는 영향과 특징을 설명해주세요.
            - 만약 존재한다면 마법이나 초자연적 현상의 규칙과 한계 - 마법/초자연 현상이 세계관에 미치는 영향과 작동 방식을 구체적으로 설명해주세요.

        5. 인물 및 종족
            - 주요 인물이나 집단, 종족의 특징과 역할 - 각 인물/종족의 개성과 세계관 내 역할을 명확하게 설명해주세요.
            - 각 인물/종족이 속한 사회적, 문화적 배경 - 인물/종족의 배경이 그들의 행동 양식에 미치는 영향을 설명해주세요.

        6. 갈등 구조
            - 사회 내부 혹은 외부의 갈등 요소(정치적 분쟁, 종족 간 충돌 등) - 갈등의 원인, 진행 과정, 결과를 구체적으로 설명해주세요.
            - 이러한 갈등이 전체 세계관에 미치는 영향 - 갈등이 세계관의 다른 요소들에 미치는 영향을 설명해주세요.

        7. 세부 설정 및 고유 용어
            - 세계관 내에서만 사용되는 독특한 용어나 법칙 정리 - 용어의 의미와 사용 예시를 설명하여 세계관의 현실성을 높여주세요.
            - 설정의 일관성을 유지할 수 있도록 참고 자료 작성 - 필요한 경우, 추가적인 자료를 작성하여 세계관의 완성도를 높여주세요.

        이 정보를 바탕으로, 소설 세계관에 대해 상세한 설명을 작성해 주세요.
        """
        model = genai.GenerativeModel("models/gemini-2.0-flash", system_instruction=instruction)
        prompt = f"## 소설 장르: {self.genre}\n## 소설 제목: {self.title}\n\n**소설 세계관**\n"
        response = model.generate_content(prompt)
        self.worldview = response.text
        print("Worldview:\n", self.worldview)
        return self.worldview

    def recommend_synopsis(self) -> str:
        """소설 줄거리 생성 함수"""
        instruction = """
        당신은 전문적으로 소설 줄거리를 만드는 작가입니다.
        생성되는 텍스트는 순수한 일반 텍스트 형식이어야 하며, 어떠한 마크다운 문법(예: **, ## 등)도 사용하지 말아주세요.
        주어진 장르, 제목, 세계관을 기반으로 독창적이고 생동감 있는 소설 줄거리를 만들어주세요.
        소설 줄거리를 구성할 때, 아래의 항목들을 참고하세요.

        1. 기본 정보
            - 장르: [예: 판타지, SF 등]
            - 제목: [제목 입력]
            - 세계관: [세계관의 배경, 시대, 문화, 기술 등 간단히 설명]
        
        2. 발단
            - 소설이 펼쳐지는 세계관의 기초 소개
            - 주요 인물들의 소개 및 그들이 추구하는 기본 목표
            - 이야기에 숨은 첫 갈등이나 문제의 암시
        
        3. 전개
            - 주된 갈등 및 도전 과제의 본격적인 전개
            - 인물들 간의 관계, 서브 플롯, 그리고 각 인물의 내면적 변화
            - 주인공이 맞서야 하는 문제와 성장 과정을 상세히 설명
        
        4. 위기
            - 갈등이 극한으로 치닫는 순간, 상황이 악화되고 긴장이 고조됨
            - 주인공과 주변 인물들이 맞닥뜨리는 결정적 어려움 및 시련
            - 이야기의 전환점 역할을 하는 중요한 사건 발생
        
        5. 절정
            - 갈등의 최고조, 결정적인 대립과 순간의 전환
            - 주인공의 중대한 선택 및 운명을 건 마지막 대결
            - 전체 이야기의 긴장감과 감정이 폭발하는 순간
        
        6. 결말
            - 갈등의 해소와 함께 인물들의 변화 및 성장 결과 제시
            - 사건이 세계관에 미친 영향과 이후의 여운 남기는 마무리
            - 독자에게 남기는 메시지 혹은 후일담

        위 템플릿에 따라 소설의 줄거리를 상세하게 작성해 주세요. 
        """
        model = genai.GenerativeModel("models/gemini-2.0-flash", system_instruction=instruction)
        prompt = f"## 소설 장르: {self.genre}\n## 소설 제목: {self.title}\n##소설 세계관: {self.worldview}\n\n**소설 줄거리**\n"
        response = model.generate_content(prompt)
        self.synopsis = response.text
        print("Synopsis:\n", self.synopsis)
        return self.synopsis
    
    def generate_introduction(self) -> str:
        """소설 소개글 생성 함수: 장르, 제목, 세계관, 줄거리를 반영하여 100-200자 분량의 소개글을 작성합니다."""
        instruction = """
        당신은 전문적인 소설 소개글 작가입니다.
        아래 조건을 충족하는 소개글을 작성해주세요.
        - 소설의 장르, 제목, 세계관, 줄거리를 기반으로 작성합니다.
        - 소개글은 100~200자 분량의 짧은 문장이어야 합니다.
        - 텍스트는 순수한 일반 텍스트 형식이어야 하며, 어떠한 마크다운 문법도 사용하지 마세요.
        """
        model = genai.GenerativeModel("models/gemini-2.0-flash", system_instruction=instruction)
        prompt = (
            f"## 소설 장르: {self.genre}\n"
            f"## 소설 제목: {self.title}\n"
            f"## 소설 세계관: {self.worldview}\n"
            f"## 소설 줄거리: {self.synopsis}\n\n"
            "**소설 소개글 (100-200자)**\n"
        )
        response = model.generate_content(prompt)
        introduction = response.text.strip()
        print("소설 소개글:\n", introduction)
        return introduction

    def recommend_characters(self) -> str:
        """소설 등장인물 생성 함수"""
        instruction = """
        당신은 전문적으로 등장인물을 구성하는 소설 작가입니다. 
        주어진 장르, 제목, 세계관, 줄거리를 기반으로 소설 등장인물을 만들어주세요.

        각 등장인물은 다음 속성을 포함하는 JSON 형태(dict)로 표현되어야 합니다.

        * name: (예: 홍길동, 춘향이 등) - 등장인물의 이름 (필수)
        * sex: (예: 남, 여, 기타) - 등장인물의 성별 (필수)
        * age: (예: 20세, 30대 초반 등) - 등장인물의 나이 (필수)
        * role: (예: 주인공, 조력자, 악당 등) - 이야기 속 역할 (필수)
        * job: (예: 의사, 학생, 무사 등) - 등장인물의 직업 (필수)
        * profile: 등장인물의 외모, 성격, 능력, 과거, 관계 등 여러 특징을 하나의 자연스러운 문장으로 작성해 주세요.
          (예: "키 180cm에 날카로운 눈매와 과묵한 성격을 가지고 있으며, 특정 능력과 습관, 버릇, 가치관 등이 돋보이고, 가문 및 출신과 과거가 있으며, 주인공과 친구 혹은 연인 관계를 형성한다.")
            - (예: 키 180cm, 날카로운 눈매, 과묵한 성격 등) - 외모, 성격, 능력 등 세부 묘사 (선택)
            - (예: 특정 능력, 습관, 버릇, 가치관 등) - 등장인물의 개성을 드러내는 특징 (선택)
            - (예: 가문, 출신, 과거 등) - 등장인물의 과거와 배경 (선택)
            - (예: 주인공과 친구, 연인 관계 등) - 다른 등장인물과의 관계 (선택)

        여러 명의 등장인물을 생성할 수 있으며, 각 등장인물은 아래와 같은 형태로 표현되어야 합니다.

        characters =
            {
                "name": "홍길동",
                "sex": "남",
                "age": "20",
                "role": "주인공",
                "job": "무사",
                "profile": "활달한 성격"
            },
            {
                "name": "춘향이",
                "sex": "여",
                "age": "18",
                "role": "조력자",
                "job": "농부",
                "profile": "밝고 활발한 성격"
            }
        """
        model = genai.GenerativeModel("models/gemini-2.0-flash", system_instruction=instruction)
        prompt = (
            f"## 소설 장르: {self.genre}\n"
            f"## 소설 제목: {self.title}\n"
            f"## 소설 세계관: {self.worldview}\n"
            f"## 소설 줄거리: {self.synopsis}\n"
            f"## 기존 소설 등장인물: {self.characters}\n\n"
            "**새로운 소설 등장인물**\n"
        )
        response = model.generate_content(prompt)
        new_characters = response.text
        new_characters = re.sub(r'```json\n(.*?)\n```', r'\1', new_characters, flags=re.DOTALL)
        try:
            existing = json.loads(self.characters) if self.characters.strip() else []
            if not isinstance(existing, list):
                existing = [existing]
        except Exception:
            existing = []
        try:
            new_char = json.loads(new_characters)
        except Exception:
            new_char = new_characters
        # 수정: new_char가 리스트인 경우 extend, 그렇지 않으면 append
        if isinstance(new_char, list):
            existing.extend(new_char)
        else:
            existing.append(new_char)
        self.characters = json.dumps(existing, ensure_ascii=False, indent=2)
        print("Characters:\n", self.characters)
        return self.characters

    def add_new_characters(self) -> str:
        """
        기존 등장인물에 추가로 새로운 등장인물을 생성하는 함수.
        기존 캐릭터와 차별화된 새로운 인물들을 생성하여 기존 목록 리스트에 덧붙입니다.
        """
        instruction = """
        당신은 전문적으로 등장인물을 구성하는 소설 작가입니다. 
        주어진 장르, 제목, 세계관, 줄거리, 기존 등장인물들을 기반으로 기존과 다른 새로운 소설 등장인물을 만들어주세요.

        등장인물은 다음 속성을 포함하는 JSON 형태(dict)로 표현되어야 합니다.

        * name: (예: 홍길동, 춘향이 등) - 등장인물의 이름 (필수)
        * sex: (예: 남, 여, 기타) - 등장인물의 성별 (필수)
        * age: (예: 20세, 30대 초반 등) - 등장인물의 나이 (필수)
        * role: (예: 주인공, 조력자, 악당 등) - 이야기 속 역할 (필수)
        * job: (예: 의사, 학생, 무사 등) - 등장인물의 직업 (필수)
        * profile: 등장인물의 외모, 성격, 능력, 과거, 관계 등 여러 특징을 하나의 자연스러운 문장으로 작성해 주세요.
          (예: "키 180cm에 날카로운 눈매와 과묵한 성격을 가지고 있으며, 특정 능력과 습관, 버릇, 가치관 등이 돋보이고, 가문 및 출신과 과거가 있으며, 주인공과 친구 혹은 연인 관계를 형성한다.")
        등장인물은 아래와 같은 형태로 표현되어야 하며, 한 명의 캐릭터를 생성합니다.

        characters =
            {
                "name": "홍길동",
                "sex": "남",
                "age": "20",
                "role": "주인공",
                "job": "무사",
                "profile": "활달한 성격"
            }
        """
        model = genai.GenerativeModel("models/gemini-2.0-flash", system_instruction=instruction)
        prompt = (
            f"## 소설 장르: {self.genre}\n"
            f"## 소설 제목: {self.title}\n"
            f"## 소설 세계관: {self.worldview}\n"
            f"## 소설 줄거리: {self.synopsis}\n"
            f"## 기존 소설 등장인물: {self.characters}\n\n"
            "**추가 생성된 소설 등장인물**\n"
        )
        response = model.generate_content(prompt)
        additional_characters = response.text
        additional_characters = re.sub(r'```json\n(.*?)\n```', r'\1', additional_characters, flags=re.DOTALL)
        try:
            existing = json.loads(self.characters) if self.characters.strip() else []
            if not isinstance(existing, list):
                existing = [existing]
        except Exception:
            existing = []
        try:
            new_char = json.loads(additional_characters)
        except Exception:
            new_char = additional_characters
        if isinstance(new_char, list):
            existing.extend(new_char)
        else:
            existing.append(new_char)
        self.characters = json.dumps(existing, ensure_ascii=False, indent=2)
        print("Updated Characters:\n", self.characters)
        return self.characters


    def create_chapter(self) -> str:
        """
        DB에 저장된 이전 챕터들을 모두 불러와서, 
        이를 기반으로 새 챕터(초안 또는 다음 화)를 생성합니다.
        각 챕터는 500-1000자 정도로 작성합니다.
        """
        
        if not self.previous_chapters:
            # 이전 챕터가 없다면 첫 번째 장(초안) 생성
            instruction = """
            당신은 탁월한 창의력과 독창성을 가진 전문 소설 작가입니다.
            아래 지시사항에 따라 소설 초안을 작성해주세요. 
            생성되는 텍스트는 순수한 일반 텍스트 형식이어야 하며, 어떠한 마크다운 문법(예: **, ## 등)도 사용하지 마세요.
            주어진 장르, 제목, 세계관, 줄거리, 등장인물의 정보를 바탕으로 에피소드 초안이 작성되어야 합니다.
            에피소드는 700-1500자 분량으로 작성하세요.

            작성 시 다음 항목들을 반드시 반영합니다:
            1. 소설의 분위기와 문체를 장르에 맞게 설정합니다.
            2. 텍스트의 마지막 문장은 반드시 완성된 문장으로 구성되고, 자연스러운 마무리로 작성합니다.
            """
            chapter_label = "**소설 초안**\n"
        else:
            # 이전 챕터가 있다면 DB의 모든 내용을 기반으로 다음 화 생성
            instruction = """
            당신은 탁월한 창의력과 독창성을 가진 전문 소설 작가입니다. 
            아래 지시사항에 따라 소설의 다음 화를 작성해주세요. 
            생성되는 텍스트는 순수한 일반 텍스트 형식이어야 하며, 어떠한 마크다운 문법(예: **, ## 등)도 사용하지 마세요.
            주어진 장르, 제목, 세계관, 줄거리, 등장인물 및 이전 에피소드의 내용을 기반으로 다음 에피소드를 작성해야 합니다.
            에피소드는 700-1500자 분량으로 작성하세요.

            작성 시 다음 항목들을 반드시 반영합니다:
            1. 소설의 분위기와 문체를 장르에 맞게 유지하며, 이전 에피소드의 흐름과 일관되게 전개합니다.
            2. 이전 에피소드의 내용을 참고하여 내용이 자연스럽게 연결되도록 작성하세요.
            3. 텍스트의 마지막 문장은 반드시 완성된 문장으로 구성되고, 이야기의 흐름이 자연스럽게 마무리되도록 작성합니다.
            """
            chapter_label = "**소설 다음 에피소드드**\n"
        
        model = genai.GenerativeModel("models/gemini-2.0-flash", system_instruction=instruction)
        prompt = (
            f"## 소설 장르: {self.genre}\n"
            f"## 소설 제목: {self.title}\n"
            f"## 소설 세계관: {self.worldview}\n"
            f"## 소설 줄거리: {self.synopsis}\n"
            f"## 소설 등장인물: {self.characters}\n"
        )
        if self.previous_chapters:
            prompt += f"## 소설 이전 에피소드: {self.previous_chapters}\n\n"
        prompt += chapter_label

        response = model.generate_content(prompt)
        chapter_text = response.text

        print("New Chapter:\n", chapter_text)
        return chapter_text


# # 예시 사용법:
# if __name__ == "__main__":
#     # 소설의 장르와 제목을 입력합니다.
#     genre = input("소설의 장르를 입력하세요: ex) 판타지, 로맨스, 스릴러 등\n")
#     title = input("소설의 제목을 입력하세요: ex) 괴식식당, 신의탑, 전생전기 등\n")

#     novel_gen = NovelGenerator(genre, title)
    
#     # 순차적으로 각 단계의 결과를 생성합니다.
#     input("세계관 생성을 시작합니다. 엔터를 눌러주세요.")
#     novel_gen.recommend_worldview()
#     input("줄거리 생성을 시작합니다. 엔터를 눌러주세요.")
#     novel_gen.recommend_synopsis()
#     input("등장인물 생성을 시작합니다. 엔터를 눌러주세요.")
#     novel_gen.recommend_characters()
    
#     # 첫 번째 장(초안) 생성
#     input("첫 번째 장(초안) 생성을 시작합니다. 엔터를 눌러주세요.")
#     chapter1 = novel_gen.create_chapter()
    
#     # 이후 생성할 챕터는 create_chapter()를 호출하면 DB에 저장된 모든 챕터가 입력값으로 사용됩니다.
#     input("다음 장 생성을 시작합니다. 엔터를 눌러주세요.")
#     chapter2 = novel_gen.create_chapter()
import os
import re
import json
from dotenv import load_dotenv
import google.generativeai as genai
import mysql.connector
from mysql.connector import errors

class NovelGenerator:
    def __init__(self, genre: str, title: str):
        # 환경변수 로드 및 API, DB 설정
        load_dotenv()
        self.GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
        genai.configure(api_key=self.GEMINI_API_KEY)

        self.genre = genre
        self.title = title
        self.worldview = ""
        self.synopsis = ""
        self.characters = ""
        self.first_chapter = ""
        self.next_chapter = ""
        
        # 여기서는 간단한 예시로 단일 소설에 대해 novel_pk를 1로 고정
        self.novel_pk = 1
        
        # DB 접속정보
        self.db_host = os.getenv("DB_HOST")
        self.db_port = int(os.getenv("DB_PORT", "3306"))
        self.db_user = os.getenv("DB_USER")
        self.db_password = os.getenv("DB_PASSWORD")
        self.db_name = os.getenv("DB_NAME")
        
        # 데이터베이스가 없는 경우 생성하도록 처리
        try:
            self.db_connection = mysql.connector.connect(
                host=self.db_host,
                port=self.db_port,
                user=self.db_user,
                password=self.db_password,
                database=self.db_name
            )
        except errors.ProgrammingError as e:
            if e.errno == 1049:  # Unknown database
                print(f"데이터베이스 {self.db_name}가 존재하지 않습니다. 데이터베이스를 생성합니다.")
                temp_conn = mysql.connector.connect(
                    host=self.db_host,
                    port=self.db_port,
                    user=self.db_user,
                    password=self.db_password
                )
                temp_cursor = temp_conn.cursor()
                temp_cursor.execute(f"CREATE DATABASE IF NOT EXISTS {self.db_name}")
                temp_conn.commit()
                temp_cursor.close()
                temp_conn.close()
                # 데이터베이스 생성 후 다시 연결
                self.db_connection = mysql.connector.connect(
                    host=self.db_host,
                    port=self.db_port,
                    user=self.db_user,
                    password=self.db_password,
                    database=self.db_name
                )
            else:
                raise e
        
        self.create_table_if_not_exists()

    def create_table_if_not_exists(self):
        """episode 테이블이 없으면 생성"""
        cursor = self.db_connection.cursor()
        query = """
        CREATE TABLE IF NOT EXISTS episode (
            ep_pk INT AUTO_INCREMENT PRIMARY KEY,
            ep_title VARCHAR(255) NOT NULL,
            novel_pk INT NOT NULL,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            ep_content TEXT NOT NULL
        )
        """
        cursor.execute(query)
        self.db_connection.commit()
        cursor.close()

    def insert_episode(self, ep_title: str, ep_content: str):
        """새 에피소드를 DB에 저장합니다."""
        cursor = self.db_connection.cursor()
        query = """
        INSERT INTO episode (ep_title, novel_pk, ep_content)
        VALUES (%s, %s, %s)
        """
        cursor.execute(query, (ep_title, self.novel_pk, ep_content))
        self.db_connection.commit()
        cursor.close()

    def get_previous_episodes(self) -> str:
        """해당 소설의 모든 에피소드(ep_content)를 created_date 기준 오름차순으로 불러와 하나의 문자열로 합칩니다."""
        cursor = self.db_connection.cursor()
        query = """
        SELECT ep_content FROM episode
        WHERE novel_pk = %s
        ORDER BY created_date ASC
        """
        cursor.execute(query, (self.novel_pk,))
        rows = cursor.fetchall()
        cursor.close()
        episodes = "\n\n---\n\n".join([row[0] for row in rows])
        return episodes

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
        """
        model = genai.GenerativeModel("models/gemini-2.0-flash", system_instruction=instruction)
        prompt = f"## 소설 장르: {self.genre}\n## 소설 제목: {self.title}\n\n**소설 세계관**\n"
        response = model.generate_content(prompt)
        self.worldview = response.text
        print("소설 세계관:\n", self.worldview)
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
        prompt = f"## 소설 장르: {self.genre}\n## 소설 제목: {self.title}\n## 소설 세계관: {self.worldview}\n\n**소설 줄거리**\n"
        response = model.generate_content(prompt)
        self.synopsis = response.text
        print("소설 줄거리:\n", self.synopsis)
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

        * 이름: (예: 홍길동, 춘향이 등) - 등장인물의 이름 (필수)
        * 성별: (예: 남, 여, 기타) - 등장인물의 성별 (필수)
        * 나이: (예: 20세, 30대 초반 등) - 등장인물의 나이 (필수)
        * 역할: (예: 주인공, 조력자, 악당 등) - 이야기 속 역할 (필수)
        * 직업: (예: 의사, 학생, 무사 등) - 등장인물의 직업 (필수)
        * 프로필: 등장인물의 외모, 성격, 능력, 과거, 관계 등 여러 특징을 하나의 자연스러운 문장으로 작성해 주세요.
          (예: "키 180cm에 날카로운 눈매와 과묵한 성격을 가지고 있으며, 특정 능력과 습관, 버릇, 가치관 등이 돋보이고, 가문 및 출신과 과거가 있으며, 주인공과 친구 혹은 연인 관계를 형성한다.")
            - (예: 키 180cm, 날카로운 눈매, 과묵한 성격 등) - 외모, 성격, 능력 등 세부 묘사 (선택)
            - (예: 특정 능력, 습관, 버릇, 가치관 등) - 등장인물의 개성을 드러내는 특징 (선택)
            - (예: 가문, 출신, 과거 등) - 등장인물의 과거와 배경 (선택)
            - (예: 주인공과 친구, 연인 관계 등) - 다른 등장인물과의 관계 (선택)

        여러 명의 등장인물을 생성할 수 있으며, 각 등장인물은 아래와 같은 형태로 표현되어야 합니다.

        characters =
            {
                "이름": "홍길동",
                "성별": "남",
                "나이": "20",
                "역할": "주인공",
                "직업": "무사",
                "프로필": "활달한 성격"
            },
            {
                "이름": "춘향이",
                "성별": "여",
                "나이": "18",
                "역할": "조력자",
                "직업": "농부",
                "프로필": "밝고 활발한 성격"
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
        print("소설 등장인물:\n", self.characters)
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

        * 이름: (예: 홍길동, 춘향이 등) - 등장인물의 이름 (필수)
        * 성별: (예: 남, 여, 기타) - 등장인물의 성별 (필수)
        * 나이: (예: 20세, 30대 초반 등) - 등장인물의 나이 (필수)
        * 역할: (예: 주인공, 조력자, 악당 등) - 이야기 속 역할 (필수)
        * 직업: (예: 의사, 학생, 무사 등) - 등장인물의 직업 (필수)
        * 프로필: 등장인물의 외모, 성격, 능력, 과거, 관계 등 여러 특징을 하나의 자연스러운 문장으로 작성해 주세요.
          (예: "키 180cm에 날카로운 눈매와 과묵한 성격을 가지고 있으며, 특정 능력과 습관, 버릇, 가치관 등이 돋보이고, 가문 및 출신과 과거가 있으며, 주인공과 친구 혹은 연인 관계를 형성한다.")
        등장인물은 아래와 같은 형태로 표현되어야 하며, 한 명의 캐릭터를 생성합니다.

        characters =
            {
                "이름": "홍길동",
                "성별": "남",
                "나이": "20",
                "역할": "주인공",
                "직업": "무사",
                "프로필": "활달한 성격"
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
        print("소설 등장인물 업데이트:\n", self.characters)
        return self.characters

    def create_episode(self) -> str:
        """
        DB에 저장된 이전 에피소드들을 모두 불러와서, 
        이를 기반으로 새 에피소드(초안 또는 다음 화)를 생성합니다.
        각 에피소드는 500-1000자 정도로 작성합니다.
        """
        previous_episodes = self.get_previous_episodes()
        
        if not previous_episodes:
            # 이전 에피소드가 없다면 첫 번째 에피소드(초안) 생성
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
            episode_label = "**소설 초안**\n"
        else:
            # 이전 에피소드가 있다면 DB의 모든 내용을 기반으로 다음 화 생성
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
            episode_label = "**소설 다음화**\n"
        
        model = genai.GenerativeModel("models/gemini-2.0-flash", system_instruction=instruction)
        prompt = (
            f"## 소설 장르: {self.genre}\n"
            f"## 소설 제목: {self.title}\n"
            f"## 소설 세계관: {self.worldview}\n"
            f"## 소설 줄거리: {self.synopsis}\n"
            f"## 소설 등장인물: {self.characters}\n"
        )
        if previous_episodes:
            prompt += f"## 소설 이전 에피소드: {previous_episodes}\n\n"
        prompt += episode_label

        response = model.generate_content(prompt)
        episode_content = response.text

        # 에피소드 번호는 기존 에피소드 수 + 1
        cursor = self.db_connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM episode WHERE novel_pk = %s", (self.novel_pk,))
        (count,) = cursor.fetchone()
        cursor.close()
        ep_number = count + 1
        ep_title = f"Episode {ep_number}"

        # 새로 생성된 에피소드를 DB에 저장
        self.insert_episode(ep_title, episode_content)

        if ep_number == 1:
            self.first_episode = episode_content
            print("에피소드 1화:\n", episode_content)
        else:
            self.next_episode = episode_content
            print(f"에피소드 {ep_number}화:\n", episode_content)
        return episode_content


# 예시 사용법:
if __name__ == "__main__":
    # 소설의 장르와 제목을 입력합니다.
    genre = input("소설의 장르를 입력하세요: ex) 판타지, 로맨스, 스릴러 등\n")
    title = input("소설의 제목을 입력하세요: ex) 괴식식당, 신의탑, 전생전기 등\n")

    novel_gen = NovelGenerator(genre, title)
    
    # 순차적으로 각 단계의 결과를 생성합니다.
    input("세계관 생성을 시작합니다. 엔터를 눌러주세요.")
    novel_gen.recommend_worldview()
    input("줄거리 생성을 시작합니다. 엔터를 눌러주세요.")
    novel_gen.recommend_synopsis()
    input("소개글 생성을 시작합니다. 엔터를 눌러주세요.")
    novel_gen.generate_introduction()

    input("등장인물 생성을 시작합니다. 엔터를 눌러주세요.")
    novel_gen.recommend_characters()
    
    # 추가 등장인물 생성을 위한 기능 호출
    input("추가 등장인물 생성을 시작합니다. 엔터를 눌러주세요.")
    novel_gen.add_new_characters()
    
    # 첫 번째 에피소드(초안) 생성
    input("첫 번째 에피소드(초안) 생성을 시작합니다. 엔터를 눌러주세요.")
    episode1 = novel_gen.create_episode()
    
    # 이후 생성할 에피소드는 create_episode()를 호출하면 DB에 저장된 모든 에피소드가 입력값으로 사용됩니다.
    input("다음 에피소드 생성을 시작합니다. 엔터를 눌러주세요.")
    episode2 = novel_gen.create_episode()

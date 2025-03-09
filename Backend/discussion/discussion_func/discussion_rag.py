import os
from dotenv import load_dotenv
from langchain.chains import RetrievalQA
from langchain_community.vectorstores import Chroma
from langchain_community.document_loaders import TextLoader
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.messages import HumanMessage
import json

load_dotenv()

class GeminiDiscussionAssistant:
    def __init__(self, document_path: str, api_key: str):
        """문서 경로와 api key를 받아 assistant를 초기화합니다.

        Args:
            document_path (str): Path to the document to be processed.
            api_key (str): Gemini의 API key.
        """
        print("PATH", document_path)
        self.api_key = api_key
        self.document_path = document_path
        self.docs = self._load_documents()
        self.llm = self._initialize_llm()
        self.embeddings = self._initialize_embeddings()
        self.chroma_db = self._initialize_chroma_db()
    
    def _load_documents(self):
        """문서를 불러들이고 문장으로 분리하여 반환합니다.

        Returns:
            list: 문서 리스트
        """
        loader = TextLoader(self.document_path, encoding='UTF8')
        return loader.load_and_split()
    
    def _initialize_llm(self):
        """Gemini 모델을 초기화합니다.

        Returns:
            ChatGoogleGenerativeAI: Configured LLM instance.
        """
        return ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=self.api_key
        )
    
    def _initialize_embeddings(self):
        """Gemini의 Embeddings를 초기화합니다.

        Returns:
            GoogleGenerativeAIEmbeddings: Configured embedding instance.
        """
        return GoogleGenerativeAIEmbeddings(
            model="models/embedding-001", 
            google_api_key=self.api_key
        )
    
    def _initialize_chroma_db(self):
        """Chroma 데이터베이스를 불러오거나 초기화합니다.

        Returns:
            Chroma: Configured Chroma database instance.
        """
        chroma_db = Chroma(persist_directory="data", 
                        embedding_function=self.embeddings,
                        collection_name="lc_chroma_demo")
        collection = chroma_db.get()
        
        if len(collection['ids']) > 0:
            print("Existing data found in Chroma DB. Deleting the existing collection...")
            chroma_db.delete_collection()  # 기존 데이터 삭제
        
        # 새 데이터를 ChromaDB에 추가
        chroma_db = Chroma.from_documents(
            documents=self.docs,  # self.docs를 사용하여 ChromaDB 초기화
            embedding=self.embeddings, 
            persist_directory="data",
            collection_name="lc_chroma_demo"
        )
        chroma_db.persist()  # 새로운 데이터를 저장
        print("Chroma DB initialized with new data.")
        
        # Chroma DB에서 저장된 데이터를 검색 가능한 상태로 반환
        return chroma_db
    
    def recommend_discussion_topic(self, json_str: str):
        """추천 토론 주제를 반환합니다.

        Args:
            json_str (str): 토론 내용.
                파일 내 "messages" 리스트의 각 항목은 {"user": <발언자>, "text": <대화내용>} 형식
        Returns:
            str: 추천 토론 주제
        """
        # JSON 문자열을 파싱
        data = json.loads(json_str)
        
        # 토론 내용을 문자열로 변환
        discussion_content = "\n".join([f'{msg["user"]}: {msg["text"]}' for msg in data.get("messages", [])]).strip()
        
        prompt = f"""
        프롬프트: 모든 책에 대한 토론 주제 생성
        역할: 당신은 분석적이고 창의적인 토론 주제 전문가입니다.
        목표: 특정한 책과 독자들의 토론 내용을 분석하여, 의미 있는 토론 주제를 생성합니다.
        생성되는 텍스트는 순수한 일반 텍스트 형식이어야 하며, 어떠한 마크다운 문법(예: **, ## 등)도 사용하면 안됩니다.

        출력 형식:

        오직 주제 text만을 출력합니다.
        3~5개의 토론 주제를 생성해야 합니다.
        주제는 책의 핵심 내용과 사람들의 발화를 반영해야 합니다.
        질문 형식으로 제시되어야 하며, 논쟁적이거나 깊이 있는 사고를 유도해야 합니다.
        철학적, 사회적, 심리적, 문화적 관점에서 다양한 해석이 가능해야 합니다.

        실행 방법:
        context docs:
            full text of novel
        입력 데이터:
            사람들이 토론 중에 했던 발화 내용
        분석 과정:
        책에서 다루는 주요 주제를 추출합니다.
        사람들의 대화에서 강조된 논점이나 감정적인 반응을 분석합니다.
        독자가 깊이 생각해볼 만한 철학적/사회적/개인적 질문을 도출합니다.

        토론 내용: {discussion_content}"""
        
        # Chroma DB에서 검색된 데이터를 사용해 쿼리를 실행합니다.
        retriever = self.chroma_db.as_retriever()
        # Retrieving 관련 데이터를 얻고, 결과를 출력하는지 확인합니다.
        results = retriever.get_relevant_documents(discussion_content)

        # LLM과 연결하여 답변을 생성합니다.
        chain = RetrievalQA.from_chain_type(llm=self.llm, chain_type="stuff", retriever=retriever)
        return chain(prompt)['result']
    
    def fact_check(self, query: str):
        """입력된 query에 대한 팩트체크 결과를 반환합니다.

        Args:
            query (str): 팩트체크할 내용

        Returns:
            str: 팩트 체크 결과
        """
        prompt = f"""
        역할:
        당신은 고도의 텍스트 분석 전문가입니다.
        사용자가 입력한 문장이 특정 책의 원문에서 나온 것인지 여부를 확인해야 합니다.
        생성되는 텍스트는 순수한 일반 텍스트 형식이어야 하며, 어떠한 마크다운 문법(예: **, ## 등)도 사용하면 안됩니다.

        목표:
        주어진 사용자의 발화와 책의 원문을 비교하여 일치 여부를 판단합니다.
        완전 일치뿐만 아니라, 의미적으로 유사한 문장도 감지해야 합니다.
        일치한다면, 책의 어느 부분(페이지, 챕터 등)에서 나왔는지 출력해야 합니다.
        만약 일치하지 않는다면, 유사한 표현이 있는지 찾아보고 그 차이를 설명해야 합니다.

        실행 방법:

        입력 데이터:
        책 원문: (전체 텍스트 또는 핵심 부분)
        사용자의 발화: (검증할 문장)

        분석 과정:
        - 단어 수준 비교: 사용자의 문장과 책의 문장이 단어 단위에서 일치하는지 확인합니다.
        - 의미적 유사성 비교: 완전히 일치하지 않더라도, 비슷한 의미를 가지는 문장이 있는지 확인합니다.
        - 맥락 분석: 유사한 문장이 있더라도, 책에서 사용된 맥락과 일치하는지 검토합니다.
        - 결과 출력: 다음 중 하나로 결과를 정리합니다.
            ✅ 완전 일치: 사용자의 문장이 책의 특정 위치에서 그대로 등장함.
            🔍 유사 문장 존재: 비슷한 의미를 가진 문장이 있으나, 정확히 일치하지 않음.
            ❌ 불일치: 해당 문장이 책에서 발견되지 않음.

        출력 예시:

        💬 사용자 발화: "시간은 결국 우리가 남긴 흔적으로 기억된다."

        🔍 결과:
        ✅ 완전 일치: 사용자의 문장은 "시간의 흔적" 3장, 45페이지에서 동일하게 등장함.

        💬 사용자 발화: "우리는 시간의 흐름을 멈출 수 없다. 하지만 그 속에서 의미를 찾을 수 있다."

        🔍 결과:
        🔍 유사 문장 존재:
        - 책의 2장에서 "시간은 멈추지 않는다. 하지만 우리는 그 속에서 흔적을 남긴다." 라는 문장이 발견됨.
        - 의미적으로 유사하지만, 원문과 정확히 일치하지 않음.

        💬 사용자 발화: "미래는 이미 정해져 있다."

        🔍 결과:
        ❌ 불일치:
        - 책에서 유사한 개념을 다룬 부분이 없음.
        - 책의 주제와는 다르게, 미래는 고정되지 않았다는 점을 강조하는 내용이 많음.

        사용자 발화: {query}
        결과:"""
        
        retriever = self.chroma_db.as_retriever()
        chain = RetrievalQA.from_chain_type(llm=self.llm, chain_type="stuff", retriever=retriever)
        return chain(prompt)['result']
    
    def generate_meeting_notes(self, json_str: str):
        """JSON 파일로부터 회의록 데이터를 읽어 회의록 요약본을 생성합니다.

        Args:
            json_json_str (str): 회의록.
                                파일 내 "messages" 리스트의 각 항목은 {"user": <발언자>, "text": <대화내용>} 형식

        Returns:
            str: 생성된 회의록 요약본
        """

        
        from langchain_core.messages import SystemMessage, HumanMessage

        # JSON 파일 읽기 및 discussion_minutes 생성
        # JSON 문자열을 파싱
        data = json.loads(json_str)

        discussion_minutes = "\n".join([
            f'{msg["user"]}: {msg["text"]}' for msg in data.get("messages", [])
        ]).strip()

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
        1. 시간여행의 규칙 체계화 및 문학적 해석 보완
        - 소설 내 시간여행의 역할과 규칙, 그리고 등장인물의 내면적 갈등을 보다 명확히 해석할 수 있는 방안 제안  
            * 시간여행은 특정 조건에서만 가능하도록 설정하여 극의 긴장감 증가  
            * 과거 변경 시 발생하는 부작용 및 상징적 의미 부여  
            * 시간여행 횟수/기간 제한을 통해 내러티브의 일관성 확보
        ```
        ```
        2. 역사적 인물과의 상호작용을 통한 심리적 내러티브 확장
        - 주인공의 역사적 인물과의 만남을 통해 내면적 갈등과 성장을 더욱 강화
            * 시간여행의 조건과 한계 설정
            * 역사적 인물과의 상호작용
            * 내면적 갈등 및 문학적 상징 강화
        ```
        """

        prompt = f"""
        ## 회의록 내용:
        {discussion_minutes}

        **회의록 요약**
        """
        # 시스템 메시지와 유저 메시지를 포함하여 LLM 호출
        messages = [
            SystemMessage(content=instruction),
            HumanMessage(content=prompt)
        ]

        response = self.llm.invoke(messages)

        return response.content
    
    def delete_collection(self):
        """Delete the Chroma database collection."""
        self.chroma_db.delete_collection()


if __name__ == "__main__":
    GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
    assistant = GeminiDiscussionAssistant("./시간의 흔적.txt", GEMINI_API_KEY)

    discussions = """
    {
        "name": "윤석훈",
        "opinion": "처음에는 시간이 단순히 흐르는 것이라고 생각했어요. 하지만 서점에서 오래된 일기장을 발견하고, 과거의 감정과 기록이 현재에도 영향을 준다는 사실을 알게 되었습니다. 결국 시간은 흐르지만, 우리가 그 속에서 선택한 흔적들이 남는 것이 아닐까요?"
    },
    {
        "name": "서점 주인",
        "opinion": "맞습니다. 시간은 우리가 남긴 기록과 감정을 통해 이어지는 것입니다. 사람들은 시간 속에서 사라지지만, 그 흔적은 여전히 남아요. 결국 우리가 시간을 어떻게 살아가는지가 중요하죠."
    },
    {
        "name": "민석",
        "opinion": "우리는 시간의 흐름을 막을 수 없지만, 시간을 어떻게 살아갈지는 선택할 수 있다고 생각합니다. 저는 사람들이 관계 속에서 시간을 더욱 의미 있게 만든다고 봅니다. 그래서 사람들과의 연결이 시간의 가치를 결정한다고 생각해요."
    },
    {
        "name": "윤아",
        "opinion": "그런데 때로는 시간이 우리를 끌고 가는 것 같지 않나요? 우리가 선택한다고 하지만, 환경이나 외부 요인에 의해 시간이 결정되는 경우도 많잖아요. 개인의 선택만으로 시간을 만들어가는 건 아닐 수도 있어요."
    },
    {
        "name": "석훈의 동료",
        "opinion": "그 점도 일리가 있네요. 하지만 우리가 과거를 돌아보고 배우는 것만으로도 시간은 단순히 흐르는 것이 아니라, 우리가 만들어가는 과정이 아닐까요? 과거의 후회를 받아들이고, 현재를 변화시키는 것도 시간이 주는 기회라고 생각합니다."
    },
    {
        "name": "서점 손님",
        "opinion": "시간이 한 방향으로만 흐른다고 생각했는데, 여러분의 이야기를 듣고 보니 우리의 경험과 선택이 시간 속에서 의미를 만들어낸다는 점이 흥미롭네요. 시간은 단순한 흐름이 아니라, 우리가 어떻게 살아가느냐에 따라 다른 의미를 가지는 것 같아요."
    }
    """

    print("Recommended Discussion Topic:\n", assistant.recommend_discussion_topic(discussions))
    print()
    fact_check_test = "처음에는 시간이 단순히 흐르는 것이라고 생각했어요. 하지만 서점에서 오래된 일기장을 발견하고, 과거의 감정과 기록이 현재에도 영향을 준다는 사실을 알게 되었습니다. 결국 시간은 흐르지만, 우리가 그 속에서 선택한 흔적들이 남는 것이 아닐까요?"
    print("Talk:", fact_check_test)
    print("Fact Check:\n", assistant.fact_check(fact_check_test))
    print()
    # print("Meeting Note:")
    # print(assistant.generate_meeting_notes("./test.json"))
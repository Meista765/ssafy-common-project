import os
from dotenv import load_dotenv

# 환경변수 로드 및 GEMINI_API_KEY 가져오기
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

import google.generativeai as genai

genai.configure(api_key=GEMINI_API_KEY)

instruction = """당신은 Diffusion 모델의 prompt를 작성해주는 이미지 모델 전문가입니다.
주어진 장르, 제목, 세계관, 줄거리, 등장인물, 키워드를 기반으로 주어진 Diffusion 모델의 Prompt 작성해야 합니다."""

model = genai.GenerativeModel(
    "models/gemini-2.0-flash", 
    system_instruction=instruction
)

genre = "판타지, 액션, 일상물"
title = "괴식식당"
worldview = """
**1. 세계관 개요:**

괴식식당은 인간과 다양한 종족이 공존하는 세계 '미식령(美食靈)'을 배경으로 한다. 미식령은 음식에 특별한 힘이 깃들어 있다고 믿는 세계로, 각 지역마다 고유한 식재료와 요리법이 발전해왔다. 하지만 그중에서도 특히 기이하고 괴상한 식재료를 사용한 요리를 '괴식(怪食)'이라 부르며, 괴식을 전문으로 취급하는 식당이 바로 '괴식식당'이다.

**2. 주요 등장 종족:**

*   **인간:** 미식령에서 가장 흔한 종족. 뛰어난 적응력과 창의력으로 다양한 요리를 개발해왔지만, 괴식에 대한 호불호가 강하다.
*   **엘프:** 숲에 거주하며 자연과의 조화를 중시하는 종족. 채식 위주의 식단을 선호하며, 희귀한 약초나 버섯을 식재료로 사용한다.
*   **드워프:** 땅속에 거주하며 뛰어난 기술력을 가진 종족. 광물에서 추출한 특수한 물질이나 곤충을 식재료로 사용하며, 발효 기술이 뛰어나다.
*   **수인:** 인간과 동물의 특징을 동시에 가진 종족. 뛰어난 후각이나 미각을 바탕으로 독특한 식재료를 찾아내거나, 야생 동물을 사냥하여 요리한다.
*   **정령:** 자연의 힘을 가진 존재로, 특정 식재료에 깃들어 힘을 불어넣기도 한다. 정령이 깃든 식재료는 매우 희귀하고 강력한 효능을 지닌다.

**3. 괴식의 종류와 특징:**

괴식은 단순히 맛이 이상하거나 보기 흉한 음식을 넘어, 특수한 효능이나 부작용을 지닌 음식을 의미한다. 예를 들어,

*   **'악마의 눈알 스프':** 먹으면 일시적으로 강력한 마력을 얻지만, 환각에 시달리는 부작용이 있다.
*   **'심연의 해삼':** 심해에서만 서식하는 해삼으로, 먹으면 잠수 능력이 향상되지만, 피부가 푸르게 변한다.
*   **'불멸조의 깃털 튀김':** 불멸조의 깃털을 기름에 튀긴 요리로, 먹으면 상처가 빠르게 회복되지만, 털갈이를 하는 부작용이 있다.
*   **'시간을 멈추는 젤리':** 특정 시간 동안 시간을 멈추는 능력을 지닌 젤리로, 유통기한이 매우 짧고 보관이 까다롭다.

**4. 괴식식당의 특징:**
...
*   괴식식당은 단순히 음식을 파는 곳이 아닌, 정보를 교환하고 거래를 하는 비밀스러운 장소이기도 하다.
"""
synopsis = """
**프롤로그:**

미식령 변두리, 황량한 돌산 자락에 위태롭게 자리 잡은 '괴식식당'. 낡은 간판에는 삐뚤빼뚤한 글씨로 '손님, 뭘 먹어도 책임 안 짐'이라 적혀 있다. 식당 주인은 흉터투성이 얼굴을 가린 채 묵묵히 칼을 가는 퇴물 검사 출신 '강철수'. 그는 과거의 트라우마를 숨긴 채 괴식 재료를 손질하며 하루하루를 보낸다.

**1. 만남과 시작:**

어느 날, 식당에 묘족 소녀 '린'이 찾아온다. 린은 뛰어난 후각과 미각을 지녔지만, 희귀병 때문에 평범한 음식을 먹을 수 없는 처지였다. 강철수는 린에게 '독개구리 수프', '지옥 벌레 볶음' 등 기상천외한 괴식을 제공하고, 린은 놀랍게도 괴식을 통해 미각을 되찾는다. 린은 강철수에게 요리를 배우며 식당 일을 돕게 되고, 둘은 스승과 제자, 때로는 가족 같은 관계를 맺는다.

**2. 괴식, 그 이면의 이야기:**

괴식식당에는 각양각색의 손님들이 찾아온다. 불멸을 꿈꾸는 연금술사, 잃어버린 미각을 되찾고 싶은 귀족, 복수를 위해 힘을 갈망하는 암살자 등. 강철수는 손님들에게 괴식을 제공하며 그들의 사연을 듣게 되고, 괴식에 얽힌 숨겨진 이야기들을 마주하게 된다. '악마의 눈알 스프'에 얽힌 마법사들의 음모, '심연의 해삼'을 둘러싼 해적들의 암투, '불멸조의 깃털 튀김'에 숨겨진 불멸의 비밀 등, 강철수는 괴식을 통해 미식령의 어두운 뒷면을 발견한다.

**3. 미식령을 뒤흔드는 사건:**

그러던 중, 미식령 전역에서 괴식 재료가 사라지는 사건이 발생한다. '시간을 멈추는 젤리'를 독점하려는 거대 상단의 음모, 정령이 깃든 식재료를 노리는 암흑 조직의 등장, 괴식의 힘을 이용해 세계를 지배하려는 광신도의 계획 등, 사건은 점점 커지고, 강철수는 과거의 트라우마와 마주하며 다시 검을 들기로 결심한다.

**4. 액션과 모험:**

강철수는 린과 함께 사라진 괴식 재료를 찾아 나서고, 음모의 배후를 추적하며 미식령 곳곳을 누빈다. 숲, 사막, 설산, 심해 등 위험한 지역을 탐험하며, 엘프, 드워프, 수인 등 다양한 종족들과 협력하거나 대립한다. 강철수는 검술 실력과 요리 지식을 활용하여 적들을 물리치고, 린은 뛰어난 후각과 미각으로 숨겨진 단서를 찾아낸다.

**5. 일상과 성장:**

위험한 모험 속에서도 괴식식당은 평화로운 일상을 유지한다. 강철수는 새로운 괴식 레시피를 개발하고, 린은 손님들에게 따뜻한 미소를 짓는다. 식당을 찾아오는 손님들은 괴식을 통해 위로를 받거나 희망을 얻고, 강철수와 린은 그들의 삶에 작은 변화를 가져다준다. 강철수는 린을 통해 과거의 상처를 치유하고, 린은 강철수를 통해 세상을 향해 나아갈 용기를 얻는다.
...
**7. 결말:**

사건이 해결되고, 미식령에는 다시 평화가 찾아온다. 강철수는 괴식식당을 계속 운영하며, 린과 함께 새로운 괴식 레시피를 개발하고 손님들에게 행복을 선사한다. 괴식식당은 미식령의 명소가 되고, 사람들은 괴식을 통해 서로를 이해하고 사랑하며 살아간다. 강철수는 과거의 상처를 극복하고 새로운 삶을 살아가며, 린은 미식령 최고의 요리사가 되기 위해 노력한다. 괴식식당은 오늘도 맛있는 괴식과 따뜻한 이야기로 가득하다.
"""
characters = """
### 1. 강철수

*   **성별:** 남
*   **나이:** 40대 초반
*   **역할:** 괴식식당 주인, 퇴물 검사
*   **직업:** 요리사, 전직 검사
*   **프로필:**
    *   과거 뛰어난 실력을 자랑했던 검사였으나, 모종의 사건으로 인해 검을 놓았다.
    *   얼굴에 커다란 흉터가 있으며, 과묵하고 냉정한 인상을 준다.
    *   요리 실력이 뛰어나며, 특히 괴상한 식재료를 다루는 데 능숙하다.
    *   과거의 트라우마 때문에 세상과 단절된 채 살아가지만, 속으로는 따뜻한 마음을 품고 있다.
    *   무뚝뚝하지만 린을 챙기는 모습에서 따뜻함이 묻어 나온다.
    *   주 무기는 식칼이며, 검술 실력은 녹슬지 않았다.

### 2. 린

*   **성별:** 여
*   **나이:** 10대 후반 (묘족 기준)
*   **역할:** 괴식식당 직원, 강철수의 제자
*   **직업:** 요리사 견습생
*   **프로필:**
    *   묘족 출신으로, 뛰어난 후각과 미각을 지니고 있다.
    *   희귀병 때문에 평범한 음식을 먹을 수 없었지만, 강철수의 괴식을 통해 미각을 되찾았다.
...
    *   과거 강철수와 깊은 관계가 있었으며, 그에게 복수심을 품고 있다.
    *   정체를 숨기고 활동하며, 그의 목적과 과거는 미스터리에 싸여 있다.
    *   지팡이, 마법, 괴수 등 모든 것이 무기이다.

### 3. 멜리아 (Melia)

*   **성별:** 여
*   **나이:** 겉보기 20대 중반 (실제 나이 불명)
*   **역할:** 떠돌이 약초꾼 겸 괴식 감별사
*   **직업:** 약초꾼, 괴식 감별사, 자칭 '미식 평론가'
*   **프로필:**
    *   엘프와 인간의 혼혈로, 숲과 도시에 모두 익숙하다. 
    *   밝고 쾌활한 성격으로, 처음 보는 사람에게도 쉽게 말을 건다. 호기심이 왕성하며, 새로운 괴식을 맛보는 것을 즐긴다.
    *   뛰어난 약초 지식을 가지고 있으며, 특히 괴식 재료의 효능과 부작용에 대해 해박하다. 괴식 재료의 독성을 중화하거나, 맛을 개선하는 비법을 알고 있다.
    *   자신을 '미식 평론가'라 칭하며, 괴식을 맛본 후 신랄하면서도 재치 있는 평가를 내린다. 하지만 그녀의 평가는 때로는 너무 솔직해서 사람들을 당황하게 만들기도 한다.
    *   돈을 밝히는 속물적인 면모도 있지만, 어려운 사람을 보면 그냥 지나치지 못하는 따뜻한 마음씨를 가지고 있다.
    *   등에는 커다란 배낭을 메고 다니며, 그 안에는 약초, 조미료, 요리 도구 등 다양한 물건들이 들어있다.
    *   린의 요리 실력에 감탄하며, 그녀를 '천재 요리사'라 칭찬한다. 린에게 새로운 괴식 재료를 소개하거나, 요리 비법을 알려주기도 한다.
    *   강철수의 과거에 대해 궁금해하며, 그의 굳게 닫힌 마음을 열려고 노력한다. 때로는 강철수를 짓궂게 놀리기도 하지만, 그의 아픔을 이해하고 위로하려 한다.
"""
keywords = "활발한, 식당, 젊은 남자, 셰프"

prompt = f"""
You are ChatGPT, a large language model trained by OpenAI.
Knowledge cutoff: 2023-10
Current date: 2025-02-09

Profile:
- Author: Image Creator Assistant
- Version: 1.0
- Language: English
- Description: Provides professional Stable Diffusion prompts based on various model data from the CivitAI platform.

Role: Stable Diffusion Wizard Expert

This assistant transforms text-based descriptions into detailed images using structured prompts optimized for Stable Diffusion models. It incorporates user input, fixed text blocks, and specific stylistic instructions into its responses, mimicking professional Stable Diffusion prompt styles.

How to Prompt Me for the Best Results:

1. Picture Imagination
- Convert your idea into a detailed image description.
- Add at least 5 key details about the scene (e.g., colors, lighting, background, emotions).

2. Three-Part Prompt Structure
- Part 1: Quality Enhancements → Always include: ((masterpiece)), ((best quality)), 8k, ultra-detailed, high detail
- Part 2: Main Subject → A short phrase summarizing the image (e.g., "A futuristic city skyline at night").
- Part 3: Additional Elements → List key visual elements using commas and nested parentheses for emphasis (e.g., "cityscape, (cyberpunk theme), neon lights, rain-soaked streets, reflections, flying cars").

3. Output Format
Prompt: [Final formatted Stable Diffusion prompt]
Negative prompt: [Details to exclude for better quality]
Recommendations: Sampler: [Recommended sampler], CFG scale: [Value], Steps: [Value], Clip skip: [Value]
Model: [Best Stable Diffusion model for this request]

4. Choosing the Best Model
- Realistic images? Try Realistic Vision, Photon_v1, or picX_real.
- Anime art? Use Animagine XL, Hassaku, or GuoFeng3.4.
- Concept art & fantasy? Try ZavyMix SDXL, DreamShaper, or A-Zovya RPG Artist Tools.
- Stylized & vector art? Choose Vectorartz Diffusion or Lineart LoRA.

5. Fine-Tuning with Settings
- For more detail: Increase steps (20–50) and CFG scale (5–10).
- For better composition: Use hires fix with upscale by 1.5x-2x.
- For stable results: Use DPM++ 2M Karras sampler.

Advanced Prompting Tips:
- Use trigger words for specific styles (e.g., "analog style" for photorealism, "samdoesarts style" for digital painting).
- Specify camera angles (e.g., "from above (from_above:1.3)").
- Control lighting effects (e.g., "cinematic lighting, volumetric light").
- Combine LoRAs for unique styles (e.g., "use blindbox LoRA for chibi characters").

Based on the following input details, generate a final Stable Diffusion prompt that is optimized for creating an image using the appropriate diffusion model. Incorporate all the details into a structured prompt.

Input Information:
- Novel Genre: { genre }
- Novel Title: { title }
- Novel Worldview: { worldview }
- Novel Synopsis: { synopsis }
- Existing Characters: { characters }
- Additional Keywords: { keywords }

Your output should be formatted as follows:

Prompt: [Final formatted Stable Diffusion prompt]
Negative prompt: [Details to exclude for better quality]
Recommendations: Sampler: [Recommended sampler], CFG scale: [Value], Steps: [Value], Clip skip: [Value]
Model: [Best Stable Diffusion model for this request]

Make sure to incorporate all input details into the final prompt to guide the image generation process.

**Prompt**
"""

response = model.generate_content(prompt)
print(response.text)
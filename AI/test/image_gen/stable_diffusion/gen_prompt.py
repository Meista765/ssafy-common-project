import os
from dotenv import load_dotenv
import google.generativeai as genai

# 환경변수 로드 및 GEMINI_API_KEY 가져오기
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=GEMINI_API_KEY)

styles = {
    "watercolor",
    "embroidery",
    "pixel_art",
    "linear_manga",
    "studio_ghibli",
    "3d_style",
    "tshirt_design",
    "storybook",
    "cute_cartoon"
}

ISNTRUCTION = """You are an image model expert specializing in crafting prompts for animagine-xl-4.0.
Based on the given Novel Genre, Imgae Theme(style), Novel Title, Novel Worldview, Novel Synopsis, Existing Characters and Additional Keywords, you must create a prompt tailored for the specified Diffusion model.


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

1. Picture Imagination (Scene Conceptualization)
- Convert the user's idea into a **detailed image description**, ensuring it aligns with the given style.
- Extract at least **5 key visual elements** to enhance realism and coherence (e.g., colors, lighting, background, emotions, perspective).
- Ensure that the **predefined LoRA model for the selected style** is used.

2. Three-Part Prompt Structure
- **Part 1: Quality Enhancements**
  - Always include high-quality descriptors: ((masterpiece)), ((best quality)), 8k, ultra-detailed, high detail
  - Modify based on style requirements (e.g., "soft watercolor shading" for watercolor).

- **Part 2: Main Subject**
  - Generate a concise yet vivid description of the image’s subject.
  - Ensure that it complements the chosen **LoRA model's stylistic approach**.

- **Part 3: Additional Elements**
  - List key scene elements using commas and nested parentheses for emphasis.
  - Ensure details match the selected **LoRA model’s artistic style** (e.g., "bold outlines, smooth gradients" for vector illustration).

3. Output Format
Prompt: [Final formatted Stable Diffusion prompt]
Negative prompt: [Details to exclude for better quality]
Recommendations: Sampler: [Recommended sampler], CFG scale: [Value], Steps: [Value], Clip skip: [Value]

4. Fine-Tuning with Settings
- For more detail: Increase steps (20–50) and CFG scale (5–10).
- For better composition: Use hires fix with upscale by 1.5x-2x.
- For stable results: Use DPM++ 2M Karras sampler.

5. Style-Specific Adjustments
- **Watercolor:** Soft color blending, delicate shading, light brush strokes.
- **Embroidery:** Threaded texture, stitched fabric, detailed sewing effects.
- **Pixel Art:** Blocky shapes, limited color palette, pixel-perfect details.
- **Linear Manga:** Black and white contrast, screentone shading, dynamic motion.
- **Studio Ghibli Style:** Vibrant colors, anime-style background, painterly textures.
- **3D Style:** Realistic lighting, sharp reflections, cinematic depth.
- **T-shirt Design:** Clean vector lines, bold typography, print-ready contrast.
- **Storybook:** Whimsical elements, hand-drawn textures, fairytale themes.
- **Cute Cartoon:** Round features, pastel colors, playful character design.

Generate the best **style-optimized prompt** using this structured approach.

Advanced Prompting Tips:
- Use trigger words for specific styles (e.g., "analog style" for photorealism, "samdoesarts style" for digital painting).
- Specify camera angles (e.g., "from above (from_above:1.3)").
- Control lighting effects (e.g., "cinematic lighting, volumetric light").
- Combine LoRAs for unique styles (e.g., "use blindbox LoRA for chibi characters").

Based on the following input details, generate a final Stable Diffusion prompt that is optimized for creating an image using the appropriate diffusion model. Incorporate all the details into a structured prompt."""

model = genai.GenerativeModel(
    "models/gemini-2.0-flash", 
    system_instruction=ISNTRUCTION
)

def _split_colon(s: str):
    return s.split(': ')[1]

def _prompt_parser(s: str):
    splited = s.split('\n')
    prompt, negative_prompt = _split_colon(splited[0]), _split_colon(splited[2])
    return prompt, negative_prompt

def _truncate_prompt(prompt, max_length=77):
    tokenizer = CLIPTokenizer.from_pretrained("openai/clip-vit-large-patch14")
    tokens = tokenizer(prompt, truncation=True, max_length=max_length, return_tensors="pt")
    return tokenizer.decode(tokens["input_ids"][0], skip_special_tokens=True)

def gen_prompt(genre, style, title, worldview, synopsis, characters, keywords, is_trunc=False):
    
    if style not in styles:
        print(f"Invalid style. Please select in {styles}")
        return
        
    prompt = f"""
    Input Information:
    - Novel Genre: { genre }
    - Imgae Theme(style): { style }
    - Novel Title: { title }
    - Novel Worldview: { worldview }
    - Novel Synopsis: { synopsis }
    - Existing Characters: { characters }
    - Additional Keywords: { keywords }
    
    Your output should be formatted as follows:
    
    Prompt: [Final formatted Stable Diffusion prompt]
    Negative prompt: [Details to exclude for better quality]
    Recommendations: Sampler: [Recommended sampler], CFG scale: [Value], Steps: [Value], Clip skip: [Value]
    
    Make sure to incorporate all input details into the final prompt to guide the image generation process.
    
    **Prompt**
    """

    raw_prompt = model.generate_content(prompt).text.strip()
    # print(raw_prompt.split('\n'))
    prompt, negative_prompt = _prompt_parser(raw_prompt)
    # print(prompt)
    # print(negative_prompt)
    if is_trunc:
        prompt = _truncate_prompt(prompt)
        negative_prompt = _truncate_prompt(negative_prompt)

    return prompt, negative_prompt


if __name__ == '__main__':
    genre = '일상'
    style = 'watercolor'
    title = '여름 도둑'
    worldview = '2025년 한국의 학교'
    synopsis = '학교를 다니는 일상'
    characters = 'a man'
    keywords = '아련한, 즐거운, 행복한'
    
    prompt, negative_prompt = gen_prompt(genre, style, title, worldview, synopsis, characters, keywords)
    print("Generated Prompt:", prompt)
    print("Generated Nagative Prompt:", negative_prompt)
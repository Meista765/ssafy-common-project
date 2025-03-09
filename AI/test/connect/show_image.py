from PIL import Image

# 저장된 이미지 불러오기
image_path = "generated_image.png"

try:
    image = Image.open(image_path)
    image.show()
    print(f"🖼️ 이미지가 {image_path}에서 열렸습니다.")
except Exception as e:
    print(f"❌ 이미지 열기 실패: {e}")

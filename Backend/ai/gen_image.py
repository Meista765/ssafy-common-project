import os
os.environ["CUDA_DEVICE_ORDER"] = "PCI_BUS_ID"   # see issue #152
os.environ["CUDA_VISIBLE_DEVICES"] = "3"

import torch
from diffusers import DiffusionPipeline
from .gen_prompt import gen_prompt


style_lora_models = {
    "watercolor": "ostris/watercolor_style_lora_sdxl",
    "embroidery": "ostris/embroidery_style_lora_sdxl",
    # "pixel_art": "artificialguybr/PixelArtRedmond",
    "pixel_art": "nerijs/pixel-art-xl",
    "linear_manga": "artificialguybr/LineAniRedmond-LinearMangaSDXL-V2",
    "studio_ghibli": "artificialguybr/StudioGhibli.Redmond-V2",
    "3d_style": "artificialguybr/3DRedmond-V1",
    "tshirt_design": "artificialguybr/TshirtDesignRedmond-V2",
    "storybook": "artificialguybr/StoryBookRedmond-V2",
    "cute_cartoon": "artificialguybr/CuteCartoonRedmond-V2",
    "sketch": "blink7630/storyboard-sketch",
    "logo": "Shakker-Labs/FLUX.1-dev-LoRA-Logo-Design",
    "realism": "prithivMLmods/Canopus-Realism-LoRA",
    "photo": "prithivMLmods/Canopus-Photo-Shoot-Mini-LoRA"
}

IMG_PATH = "./result_img"

class ImageGenerator:

    def __init__(self):

        base_model_id = "stabilityai/stable-diffusion-xl-base-1.0"
        self.pipe = DiffusionPipeline.from_pretrained(base_model_id, torch_dtype=torch.float16)
        self.pipe.to("cuda")

        # PEFT 백엔드 활성화
        self.pipe.enable_xformers_memory_efficient_attention()  # 메모리 최적화
        self.pipe.enable_model_cpu_offload()  # CPU 오프로딩

        self.loaded_adapters = set()

    def _gen_image(self, style, prompt, negative_prompt='', save=False):
        """입력된 sytle
        Args:
            style (_type_): _description_
            prompt (_type_): _description_
            negative_prompt (str, optional): _description_. Defaults to ''.
            save (bool, optional): _description_. Defaults to False.

        Returns:
            _type_: _description_
        """
        lora_model_id = style_lora_models[style]
        model_name = lora_model_id.split('/')[-1]
        if style in self.loaded_adapters:
            print(f"⚠️ Adapter '{style}' is already loaded. Skipping duplicate load.")
        else:
            self.pipe.load_lora_weights(lora_model_id, adapter_name=style)
            self.loaded_adapters.add(style)
            print(f"✅ Loaded Adapter: {style}")
        
        image = self.pipe(
            prompt,
            negative_prompt=negative_prompt,
            num_inference_steps=30,
        ).images[0]
        
        # 이미지 저장 및 출력
        if save:
            image.save(os.path.join(IMG_PATH, f"{style}-{model_name}") + '.png')
        return image

    def gen_image_pipline(self, genre, style, title, worldview, synopsis, characters, keywords):
        print("Generate Prompt...")
        
        prompt, negative_prompt = gen_prompt(genre, style, title, worldview, synopsis, characters, keywords, True)
        if prompt is None:
            print("Prompt Generating is failed")
            return None
        
        print("Generated Prompt:", prompt)
        print("Generated Nagative Prompt:", negative_prompt, end='\n')
        print("Generate Image...")

        image = self._gen_image(self.pipe, style, prompt, negative_prompt, save=True)
        image.show()

        return image


# if __name__ == "__main__":
#     generator = ImageGenerator()
#     generator.gen_image_pipline("fantasy", "watercolor", "The Last Dragon", "high", "A story about a dragon and a knight", "dragon, knight", "fantasy, adventure")

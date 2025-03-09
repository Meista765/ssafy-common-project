from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from fastapi.responses import Response

from gen_func.gen_image import ImageGenerator

# Initialize FastAPI app
app = FastAPI()


# Request Model
class ImageRequest(BaseModel):
    genre: str
    style: str
    title: str
    worldview: str
    keywords: List[str]

generator = ImageGenerator()
generator.gen_image_pipline

# API Route
@app.post("/api/v1/editor/image_ai")
async def generate_image(req: ImageRequest):
    try:
        image_bytes = generator.gen_image_pipeline(
            req.genre, req.style, req.title, req.worldview, req.keywords
        )
        return Response(content=image_bytes.getvalue(), media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
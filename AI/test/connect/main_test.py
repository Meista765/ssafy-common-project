from fastapi import FastAPI, Request
import uvicorn
import asyncio

app = FastAPI()

# 예제 데이터
database = {
    "hello": "world",
    "status": "Jupyter API is running!"
}

# 기본 엔드포인트
@app.get("/")
async def root():
    return {"message": "Hello from Jupyter API"}

# 특정 데이터 반환 (예: JSON 형태)
@app.get("/data/{key}")
async def get_data(key: str):
    if key in database:
        return {key: database[key]}
    return {"error": "Key not found"}

# POST 요청으로 실행할 수 있는 엔드포인트
@app.post("/run")
async def run_code(request: Request):
    data = await request.json()
    code = data.get("code", "")

    try:
        # 실행된 코드의 결과를 저장할 변수
        print(code)
    except Exception as e:
        return {"error": str(e)}

    return {"output": code}

# FastAPI 실행 함수 (Jupyter Notebook 비동기 실행 지원)
def run_api():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    uvicorn.run(app, host="0.0.0.0", port=8889)

# API 서버 실행
import threading
thread = threading.Thread(target=run_api)
thread.start()

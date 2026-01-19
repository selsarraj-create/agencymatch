from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import sys
import os

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from vision_engine import analyze_image

app = FastAPI()

@app.post("/api/analyze")
async def analyze_endpoint(file: UploadFile = File(...)):
    """
    Serverless function for image analysis using Gemini Vision API
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        content = await file.read()
        result = analyze_image(content, mime_type=file.content_type)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Vercel serverless handler
def handler(request):
    return app(request)

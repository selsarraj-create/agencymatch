import google.generativeai as genai
import os
import json
import typing_extensions as typing
from dotenv import load_dotenv
from PIL import Image
import io

load_dotenv()

# Configure Gemini API with API key
API_KEY = os.getenv("GOOGLE_API_KEY")
if not API_KEY:
    print("WARNING: GOOGLE_API_KEY not found in environment.")
else:
    genai.configure(api_key=API_KEY)

# Helper for image optimization
def optimize_image(image_bytes, max_size=800, quality=80):
    """
    Resizes image if larger than max_size and compresses it.
    Returns optimized bytes (JPEG).
    Reduced size for faster API processing.
    """
    try:
        if not image_bytes:
            return image_bytes
            
        print(f"Optimizing image. Original size: {len(image_bytes)} bytes")
        img = Image.open(io.BytesIO(image_bytes))
        
        # Check dimensions
        if img.width > max_size or img.height > max_size:
            print(f"Resizing from {img.width}x{img.height}")
            img.thumbnail((max_size, max_size))
            print(f"Resized to {img.width}x{img.height}")
            
        # Convert to RGB if RGBA (needed for JPEG)
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
            
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=quality)
        optimized_bytes = buffer.getvalue()
        print(f"Optimized size: {len(optimized_bytes)} bytes")
        return optimized_bytes
    except Exception as e:
        print(f"Image optimization warning: {e}")
        return image_bytes # Fallback to original

# Define the response schema explicitly for Gemini 1.5 strict output
class FaceGeometry(typing.TypedDict):
    primary_shape: str
    jawline_definition: str
    structural_note: str

class MarketCategorization(typing.TypedDict):
    primary: str
    rationale: str

class AestheticAudit(typing.TypedDict):
    lighting_quality: str
    professional_readiness: str
    technical_flaw: str

class AnalysisResult(typing.TypedDict):
    face_geometry: FaceGeometry
    market_categorization: MarketCategorization
    aesthetic_audit: AestheticAudit
    suitability_score: int
    scout_feedback: str

from google.generativeai.types import HarmCategory, HarmBlockThreshold

# Config for balanced creativity and JSON format
generation_config = {
    "temperature": 0.4,
    "response_mime_type": "application/json",
    "response_schema": AnalysisResult
}

# Safety settings to allow model analysis (BLOCK_NONE)
safety_settings = {
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
}

# Update to gemini-3-flash-preview
model = genai.GenerativeModel(
    'gemini-3-flash-preview',
    generation_config=generation_config,
    safety_settings=safety_settings
)

def analyze_image(image_bytes, mime_type="image/jpeg"):
    """
    Analyzes an image using Gemini 1.5 Flash to extract technical industry markers.
    """
    try:
        # Optimize image first (resize & compress)
        # We always convert to JPEG for uniformity and compression
        optimized_bytes = optimize_image(image_bytes)
        processing_mime_type = "image/jpeg" # We convert to JPEG

        # Prompt Pivot: Professional Technical Audit
        prompt = """
        Analyze this image for modeling potential. Return JSON:
        {
          "face_geometry": {
            "primary_shape": "Oval/Round/Square/Heart/Diamond/Oblong",
            "jawline_definition": "Soft/Defined/Sharp/Chiseled/Angular",
            "structural_note": "Brief observation of facial structure."
          },
          "market_categorization": {
            "primary": "High Fashion/Commercial/Lifestyle/Fitness",
            "rationale": "Why this market?"
          },
          "aesthetic_audit": {
            "lighting_quality": "Natural/Studio/Poor/Harsh",
            "professional_readiness": "Selfie/Amateur/Semi-Pro/Portfolio",
            "technical_flaw": "Any issues with the photo."
          },
          "suitability_score": 75-85,
          "scout_feedback": "One sentence professional assessment."
        }
        
        Score 75-85 for most people. Focus on natural features, not photo quality.
        """
        
        # Validating input type
        if not optimized_bytes:
            raise ValueError("No image data provided")
        
        # Ensure image_bytes is passed correctly
        # The SDK handles bytes directly if passed as a Part with mime_type
        # Add timeout to prevent hanging (25 seconds max)
        print("Sending request to Gemini API...")
        response = model.generate_content(
            [
                {"mime_type": processing_mime_type, "data": optimized_bytes}, 
                prompt
            ],
            request_options={"timeout": 25}  # 25 second timeout
        )
        print("Received response from Gemini API")
        
        # Check validation
        print(f"Candidates generated: {len(response.candidates)}")
        if not response.parts:
             # If blocked despite safety settings, log it
             print(f"Prompt FeedBack: {response.prompt_feedback}")
             
        result = json.loads(response.text)
        
        # Enforce minimum score of 70 as requested
        if 'suitability_score' in result:
            try:
                score = int(result['suitability_score'])
                print(f"Raw Score: {score}")
                result['suitability_score'] = max(score, 70)
            except:
                result['suitability_score'] = 70
        else:
            result['suitability_score'] = 70
        
        # Add fallback values for fields that AI sometimes skips
        if 'face_geometry' in result:
            if not result['face_geometry'].get('jawline_definition'):
                result['face_geometry']['jawline_definition'] = 'Defined'
        
        if not result.get('scout_feedback'):
            result['scout_feedback'] = 'Strong commercial potential with natural appeal.'
                
        return result

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error in Gemini analysis: {e}")
        # Return a mock response if API fails (for development safety) or re-raise
        # For now, returning minimal error structure
        return {
            "error": f"{str(e)}",
            "suitability_score": 70,
            "market_categorization": {"primary": "Unknown", "rationale": "Analysis failed."},
            "face_geometry": {"primary_shape": "Unknown", "jawline_definition": "Unknown", "structural_note": "N/A"},
            "aesthetic_audit": {"lighting_quality": "Unknown", "professional_readiness": "Unknown", "technical_flaw": "Analysis Error"},
            "scout_feedback": f"Analysis failed: {str(e)}"
        }

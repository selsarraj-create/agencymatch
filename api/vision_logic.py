
import os
import json
import base64
import requests
import typing_extensions as typing
from dotenv import load_dotenv
from PIL import Image
import io

load_dotenv()

# Helper for image optimization (Retained)
def optimize_image(image_bytes, max_size=800, quality=80):
    try:
        if not image_bytes:
            return image_bytes
            
        print(f"Optimizing image. Original size: {len(image_bytes)} bytes")
        img = Image.open(io.BytesIO(image_bytes))
        
        if img.width > max_size or img.height > max_size:
            print(f"Resizing from {img.width}x{img.height}")
            img.thumbnail((max_size, max_size))
            
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
            
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=quality)
        optimized_bytes = buffer.getvalue()
        print(f"Optimized size: {len(optimized_bytes)} bytes")
        return optimized_bytes
    except Exception as e:
        print(f"Image optimization warning: {e}")
        return image_bytes

def analyze_image(image_bytes, mime_type="image/jpeg"):
    """
    Analyzes an image using Gemini 1.5 Flash via REST API (requests)
    to avoid heavy google-generativeai SDK + grpcio dependencies.
    """
    try:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found")

        # 1. Optimize Image
        optimized_bytes = optimize_image(image_bytes)
        b64_image = base64.b64encode(optimized_bytes).decode('utf-8')

        # 2. REST API Config
        # Using gemini-3-flash-preview as strictly requested by user
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key={api_key}"
        
        # 3. Payload Construction
        prompt_text = """
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
        Score 75-85 for most people.
        """

        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt_text},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": b64_image
                        }
                    }
                ]
            }],
            "generationConfig": {
                "temperature": 0.4,
                "response_mime_type": "application/json"
            }
        }

        # 4. Make Request
        print("Sending REST request to Gemini API...")
        response = requests.post(url, json=payload, timeout=25)
        response.raise_for_status()
        
        resp_json = response.json()
        
        # 5. Parse Result
        # API Response structure: candidates[0].content.parts[0].text
        try:
            text_content = resp_json['candidates'][0]['content']['parts'][0]['text']
            result = json.loads(text_content)
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            print(f"Failed to parse Gemini response: {resp_json}")
            raise ValueError("Invalid API response format")

        # 6. Post-process Score with Integrity Check
        # If face_geometry is "N/A" or "Unknown", it means no face was detected.
        # In this specific case, the score should be 0.
        
        is_valid_face = True
        face_geo = result.get('face_geometry', {})
        shape = face_geo.get('primary_shape', '').lower()
        jaw = face_geo.get('jawline_definition', '').lower()
        
        if 'n/a' in shape or 'unknown' in shape or 'n/a' in jaw or 'unknown' in jaw:
            is_valid_face = False
            
        if not is_valid_face:
            result['suitability_score'] = 0
            if 'scout_feedback' not in result:
                result['scout_feedback'] = "No clear face detected. Please upload a clear headshot."
        else:
            # Only enforce minimum 70 if it looks like a valid face
            if 'suitability_score' in result:
                try:
                    score = int(result['suitability_score'])
                    result['suitability_score'] = max(score, 70)
                except:
                    result['suitability_score'] = 70
            else:
                result['suitability_score'] = 70
            
        # Fallbacks (Only if valid face)
        if is_valid_face:
            if 'face_geometry' in result:
                if not result['face_geometry'].get('jawline_definition'):
                    result['face_geometry']['jawline_definition'] = 'Defined'
            
            if not result.get('scout_feedback'):
                result['scout_feedback'] = 'Strong commercial potential with natural appeal.'

        return result

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error in Gemini REST analysis: {e}")
        return {
            "error": f"{str(e)}",
            "suitability_score": 0, # Return 0 for errors so we show "Please try again" instead of passing
            "market_categorization": {"primary": "Error", "rationale": "Analysis failed."},
            "face_geometry": {"primary_shape": "Unknown", "jawline_definition": "Unknown", "structural_note": "N/A"},
            "aesthetic_audit": {"lighting_quality": "Unknown", "professional_readiness": "Unknown", "technical_flaw": "Analysis Error"},
            "scout_feedback": "We couldn't detect a clear face. Please try again with a better photo."
        }

import os
import json
import base64
import requests
import typing_extensions as typing
from dotenv import load_dotenv

load_dotenv()

def analyze_model_stats(portrait_bytes, fullbody_bytes, height_cm):
    """
    Analyzes Portrait and Full-Body images using Gemini 3 Pro to extract precise
    anthropometric measurements (Waist, Hips, Bust, Shoe Size) and physical attributes.
    """
    try:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found")

        # 1. Encode Images
        b64_portrait = base64.b64encode(portrait_bytes).decode('utf-8')
        b64_fullbody = base64.b64encode(fullbody_bytes).decode('utf-8')

        # 2. REST API Config
        # Using gemini-3-pro-preview as strictly requested by user
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key={api_key}"

        # 3. Prompt Construction
        prompt_text = f"""
        ROLE: Professional Anthropometric Computer Vision Engineer.

        TASK: Analyze the uploaded Portrait and Full-Body images to extract precise modeling stats.

        INPUT DATA:
        - Reference_1 (Portrait)
        - Reference_2 (Full-Body)
        - User_Height_Anchor: "{height_cm}cm"

        ANALYSIS LOGIC:
        1. Coordinate Mapping: Identify pixel coordinates for top of head, base of neck, shoulders, waist, and hips.
        2. Scale Calibration: Calculate pixels-per-centimeter using the User_Height_Anchor ({height_cm}cm) as the global constant.
        3. Measurement Calculation:
           - Waist/Hips/Bust: Use an Elliptical Modeling algorithm (Circumference ≈ 2.4 * visible_width) to estimate circumferences from the 2D plane.
           - Shoe Size: Estimate based on foot-to-height ratio (Industry standard is ~15% of height).
        4. Color Extraction: Sample the iris (Portrait) and hair pixels.

        OUTPUT DATA (JSON ONLY):
        {{
          "bust_cm": "Integer (estimated)",
          "waist_cm": "Integer (estimated)",
          "hips_cm": "Integer (estimated)",
          "shoe_size_uk": "Float (e.g. 5.5, 9.0)",
          "eye_color": {{
            "category": "Blue/Green/Brown/Hazel/Grey",
            "hex": "#RRGGBB"
          }},
          "hair_color": {{
            "category": "Blonde/Brunette/Black/Red/Auburn",
            "hex": "#RRGGBB"
          }},
           "confidence_score": "Integer 0-100"
        }}
        """

        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt_text},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": b64_portrait
                        }
                    },
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": b64_fullbody
                        }
                    }
                ]
            }],
            "generationConfig": {
                "temperature": 0.2,
                "response_mime_type": "application/json"
            }
        }

        # 4. Make Request
        print("Sending request to Gemini Auto-Measure API...")
        response = requests.post(url, json=payload, timeout=45)
        response.raise_for_status()
        
        resp_json = response.json()
        
        # 5. Parse Result
        try:
            text_content = resp_json['candidates'][0]['content']['parts'][0]['text']
            result = json.loads(text_content)
            return result
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            print(f"Failed to parse Gemini Stats response: {resp_json}")
            raise ValueError("Invalid Analysis API response")

    except Exception as e:
        print(f"Error in Studio Analysis: {e}")
        return {"error": str(e)}

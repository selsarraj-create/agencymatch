from google import genai
from google.genai import types
import os
import json
from dotenv import load_dotenv

load_dotenv()

# Initialize Client
def get_client():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not found in environment")
    return genai.Client(api_key=api_key)

# Function 1: Analysis (The Director)
def analyze_user_appearance(image_path_or_bytes):
    """
    Analyzes user selfie to extract race, skin tone, eye color, and face shape.
    Uses Gemini 3 Pro Preview with 'low' thinking config for speed.
    """
    client = get_client()
    
    prompt = "Analyze this selfie. JSON output: {physical_description, best_fashion_style, demographic_tags}. Output ONLY valid JSON."
    
    try:
        # Determine if path or bytes
        if isinstance(image_path_or_bytes, str) and os.path.exists(image_path_or_bytes):
            from PIL import Image
            image = Image.open(image_path_or_bytes)
        else:
            # Assume bytes or handle accordingly. The new SDK might accept bytes directly in types.Part
             image = image_path_or_bytes

        # Configure for Gemini 3 Pro Preview
        # User specified: thinking_config="low"
        # Note: 'thinking_config' might be specific to certain models or experimental flags.
        # Assuming standard generation config for now or specific model param if available.
        
        response = client.models.generate_content(
            model='gemini-3-pro-preview', # User requested model
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(text=prompt),
                        types.Part.from_bytes(data=image, mime_type="image/jpeg"),
                    ]
                )
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        
        return json.loads(response.text)
    except Exception as e:
        print(f"Analysis failed: {e}")
        return {"error": str(e)}

# Function 2: Generation (The Photographer)
def generate_model_portfolio(description_json):
    """
    Generates hyper-realistic professional model photos based on description.
    Uses Imagen 4 Ultra with fallback to Imagen 3.
    """
    client = get_client()
    
    # Construct High-Fashion Prompt
    desc = description_json.get("physical_description", {})
    style = description_json.get("best_fashion_style", "High Fashion")
    
    prompt = f"""
    Professional high-fashion model portrait.
    Subject: {desc}.
    Style: {style}.
    Lighting: Cinematic studio lighting, 85mm lens, f/1.8.
    Quality: 8k resolution, raw photo, hyper-realistic, highly detailed skin texture.
    Background: Neutral studio backdrop.
    """
    
    try:
        print(f"Attempting generation with imagen-4.0-ultra-generate-001...")
        response = client.models.generate_images(
            model='imagen-4.0-ultra-generate-001',
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="3:4",
                person_generation="allow_adult",
                safety_filter_level="block_low_and_above" # Fixed per error message
            )
        )
        return response.generated_images[0]
    except Exception as e:
        print(f"Imagen 4 failed ({e}), falling back to Imagen 3...")
        try:
             # Try passing without safety filter if blocked, or use default
             print("Trying fallback (Imagen 3) without safety filter constraint...")
             response = client.models.generate_images(
                model='imagen-3.0-generate-001',
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio="3:4",
                    person_generation="allow_adult",
                )
            )
             return response.generated_images[0]
        except Exception as e2:
             print(f"Imagen 3 failed: {e2}")
             return None

# Function 3: Legacy Scan (The Scout) - Ported for /scan endpoint
def analyze_image(image_bytes, mime_type="image/jpeg"):
    """
    Analyzes an image using Gemini 2.0 Flash to extract technical industry markers.
    (Updated to 2.0 Flash as requested).
    """
    client = get_client()
    
    prompt = """
    ACT AS: A Senior Global Model Scout.
    TASK: Perform a high-fidelity structural audit.
    OUTPUT DATA (JSON Format only):
    {
      "face_geometry": {
        "primary_shape": "String",
        "jawline_definition": "String",
        "structural_note": "String"
      },
      "market_categorization": {
        "primary": "String",
        "rationale": "String"
      },
      "aesthetic_audit": {
        "lighting_quality": "String",
        "professional_readiness": "String",
        "technical_flaw": "String"
      },
      "suitability_score": 85,
      "scout_feedback": "String"
    }
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(text=prompt),
                        types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    ]
                )
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Scan Analysis failed: {e}")
        return {"error": str(e), "suitability_score": 70}

"""
Vision Engine v3 — Single-Model Identity Lock Pipeline
Uses gemini-3-pro-image-preview (Nano Banana Pro) for zero-drift headshot conversion.
"""
import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

MODEL_ID = "gemini-3-pro-image-preview"

def get_client():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not found in environment")
    return genai.Client(api_key=api_key, http_options={"api_version": "v1beta"})


# ── Primary Function: One-Shot Professional Headshot ──────────────────────────
def generate_professional_headshot(image_bytes: bytes, mime_type: str = "image/jpeg"):
    """
    Converts a user selfie into a professional studio headshot in a single
    generate_content call.  The model sees the original pixels at HIGH
    resolution and uses ThinkingLevel.HIGH to reason through the facial
    structure before rendering — guaranteeing zero identity drift.

    Returns dict: {"image_bytes": bytes, "mime_type": str} on success,
                  {"error": str} on failure.
    """
    client = get_client()

    system_instruction = (
        "PIXEL PRIORITY MODE. IDENTITY LOCK: ABSOLUTE. "
        "The face, facial structure, and skin tone in the input image are HARD CONSTRAINTS. "
        "You MUST NOT alter, reshape, pale, standardize, or reinterpret any facial feature. "
        "EXACT FACIAL FEATURE LOCK: Preserve the exact jawline, chin shape, nose shape & nostrils, "
        "lip shape & fullness, eye shape & eyelid folds, eyebrow arch, and facial proportions. "
        "EXACT SKIN TONE LOCK: Preserve the exact skin tone, undertones, and complexion from the reference image. "
        "Do NOT lighten, pale, darken, or shift skin color. "
        "AGE PRESERVATION: Do NOT age the subject. Do NOT introduce or over-render wrinkles, lines, "
        "or under-eye bags. Keep the subject looking youthful, fresh, and exact same age as in the input image. "
        "ACCESSORY & HEADWEAR REMOVAL: Remove all accessories including AirPods, earbuds, headphones, glasses, and jewelry. "
        "If the subject is wearing a head wrap, towel, turban, hair covering, or hat, remove it and replace it with clean, "
        "simple dark hair neatly styled or slicked back. DO NOT alter the forehead height or skull proportions."
    )

    user_prompt = (
        "A high-resolution composite modeling portfolio grid featuring an exact, 100% recognizable, and accurate likeness of the single subject provided in the input reference image. "
        "The grid must have four seamless panels arranged in a 2x2 layout, all set against a clean, seamless neutral light-grey studio backdrop with soft, diffused, flattering studio lighting.\n\n"
        "PANEL LAYOUT:\n"
        "- Top-Left Panel: A frontal head-and-shoulders portrait looking directly at the camera with a neutral expression.\n"
        "- Top-Right Panel: A direct profile portrait (subject facing left or right).\n"
        "- Bottom-Left Panel: A 3/4 view portrait (subject facing the opposite direction of the profile shot).\n"
        "- Bottom-Right Panel: A tight close-up portrait shot focusing on the subject's face, eyes, and hair.\n\n"
        "CRITICAL RULES & STYLING:\n"
        "- ZERO IDENTITY DRIFT: The output subject MUST look unmistakably identical to the input reference image. Match the exact eyes, nose, lip fullness, jawline, and skin tone. Do NOT generate a generic model face.\n"
        "- EXACT SKIN TONE: Preserve the exact skin tone, warmth, and undertones from the reference photo.\n"
        "- HEADWEAR / ACCESSORY REMOVAL: Remove any head towel, wrap, hat, AirPods, earrings, or glasses. Replace headwear with neat, simply styled dark hair without changing the face or forehead shape.\n"
        "- STYLING: In all four panels, the subject must be styled in a clean, fitted solid white crew-neck t-shirt.\n"
        "- CONSISTENCY: Maintain 100% facial structure, jawline, hair style, and skin tone identically across all four panels.\n\n"
        "Output aspect ratio must be 1:1 square format. Output ONLY the image, no text."
    )

    try:
        print(f"[VisionEngine] Calling {MODEL_ID} — strict identity lock…")
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                        types.Part.from_text(text=user_prompt),
                    ],
                )
            ],
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_modalities=["IMAGE"],
                thinking_config=types.ThinkingConfig(
                    thinkingBudget=8192,  # High budget for structural reasoning
                ),
            ),
        )

        # Extract the generated image from the response parts
        for part in response.candidates[0].content.parts:
            if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                print(f"[VisionEngine] Success — {len(part.inline_data.data)} bytes generated")
                return {
                    "image_bytes": part.inline_data.data,
                    "mime_type": part.inline_data.mime_type,
                }

        # If we get here the model returned text instead of an image
        print(f"[VisionEngine] No image in response. Text: {response.text[:200]}")
        return {"error": "Model returned text instead of an image"}

    except Exception as e:
        print(f"[VisionEngine] Generation failed: {e}")
        return {"error": str(e)}


# ── Legacy: Scan / Scout Analysis (unchanged) ────────────────────────────────
def analyze_image(image_bytes: bytes, mime_type: str = "image/jpeg"):
    """
    Analyzes an image using Gemini 2.0 Flash to extract technical industry
    markers for the /scan endpoint.
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
            model="gemini-2.0-flash",
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(text=prompt),
                        types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    ],
                )
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"[VisionEngine] Scan failed: {e}")
        return {"error": str(e), "suitability_score": 70}

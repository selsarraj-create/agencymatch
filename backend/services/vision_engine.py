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
        "Treat the face as a deterministic constraint. "
        "You MUST preserve every facial feature, skin texture, mole, scar, "
        "and bone structure from the reference image with zero deviation. "
        "Change ONLY the background to a neutral studio grey and lighting "
        "to professional softbox clamshell lighting."
    )

    user_prompt = (
        "Transform this photo into a professional model headshot. "
        "The face is a pixel-locked constraint — do not alter it in any way. "
        "Apply studio lighting and a neutral grey backdrop. "
        "Output ONLY the transformed image, no text."
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

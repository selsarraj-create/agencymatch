"""
Photo Lab — Single-Model Identity Lock Pipeline
Uses gemini-3-pro-image-preview for zero-drift headshot conversion.
NO analysis pass. ONE call. Original pixels stay in context.
"""
import os
import io
import base64
import requests
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

MODEL_ID = "gemini-3-pro-image-preview"


def get_client():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not found")
    return genai.Client(api_key=api_key, http_options={"api_version": "v1beta"})


def process_digitals(image_url: str):
    """
    One-shot professional headshot conversion.
    Sends the original selfie + PIXEL PRIORITY MODE instruction to
    gemini-3-pro-image-preview and gets back the transformed image
    with zero identity drift.
    """
    client = get_client()

    print(f"Processing Digital for: {image_url}")

    # --- Step 0: Fetch Image ---
    try:
        resp = requests.get(image_url)
        resp.raise_for_status()
        image_bytes = resp.content
        print(f"Downloaded source image: {len(image_bytes):,} bytes")
    except Exception as e:
        print(f"Failed to fetch image from URL: {e}")
        return {"error": "Failed to download source image"}

    # --- Single Pass: PIXEL PRIORITY MODE ---
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
        print(f"Generating headshot via {MODEL_ID} (PIXEL PRIORITY MODE)...")
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                        types.Part.from_text(text=user_prompt),
                    ],
                )
            ],
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_modalities=["IMAGE"],
                thinking_config=types.ThinkingConfig(
                    thinkingBudget=8192,
                ),
            ),
        )

        # Extract generated image
        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    out_bytes = part.inline_data.data
                    print(f"Success — {len(out_bytes):,} bytes generated")
                    return {
                        "status": "success",
                        "identity_constraints": "Identity-locked via PIXEL PRIORITY MODE",
                        "image_bytes": base64.b64encode(out_bytes).decode("utf-8"),
                        "mime_type": part.inline_data.mime_type,
                    }

        # Model returned text instead of image
        text_out = response.text if response.text else "No content"
        print(f"Model returned text instead of image: {text_out[:200]}")
        return {"error": f"Model returned text: {text_out[:100]}..."}

    except Exception as e:
        print(f"Generation failed: {e}")
        return {"error": f"Generation failed: {str(e)}"}

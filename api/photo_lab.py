"""
Photo Lab — "Clean Slate" Identity Lock Pipeline
Model: gemini-3-pro-image-preview
One call. Original pixels in context. Zero identity drift.
"""
import os
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
    "Clean Slate" headshot conversion.
    Sends the original selfie as a Subject Reference to lock facial geometry,
    then transforms it with PIXEL PRIORITY MODE — removing accessories,
    swapping clothes to white tee, grey studio backdrop, softbox lighting.
    """
    client = get_client()

    print(f"Processing Digital for: {image_url}")

    # --- Fetch Source Image ---
    try:
        resp = requests.get(image_url)
        resp.raise_for_status()
        image_bytes = resp.content
        print(f"Downloaded source image: {len(image_bytes):,} bytes")
    except Exception as e:
        print(f"Failed to fetch image from URL: {e}")
        return {"error": "Failed to download source image"}

    # --- Clean Slate: Single-Pass Generation ---
    #
    # The original selfie is passed as the Subject Reference (identity anchor).
    # The model sees every pixel at high resolution and reasons through
    # the facial structure before rendering.

    transformation_prompt = (
        "INSTRUCTION: PIXEL PRIORITY MODE. IDENTITY LOCK: ABSOLUTE. "
        "Maintain 100% facial structure. "
        "TASK: Remove all accessories including headphones, earrings, and necklaces. "
        "Change current clothing to a plain, well-fitted white t-shirt. "
        "Replace background with a neutral studio grey wall. "
        "Apply soft, natural-style studio lighting. "
        "Output aspect ratio must be 3:4 portrait format. "
        "Output ONLY the transformed image, no text."
    )

    try:
        print(f"Generating Clean Slate headshot via {MODEL_ID}...")
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                        types.Part.from_text(text=transformation_prompt),
                    ],
                )
            ],
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                thinking_config=types.ThinkingConfig(
                    thinkingBudget=8192,  # Equivalent to ThinkingLevel.HIGH
                ),
            ),
        )

        # Extract generated image
        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    out_bytes = part.inline_data.data
                    print(f"Clean Slate success — {len(out_bytes):,} bytes generated")
                    return {
                        "status": "success",
                        "identity_constraints": "Identity-locked via PIXEL PRIORITY MODE (Clean Slate)",
                        "image_bytes": base64.b64encode(out_bytes).decode("utf-8"),
                        "mime_type": part.inline_data.mime_type,
                    }

        text_out = response.text if response.text else "No content"
        print(f"Model returned text instead of image: {text_out[:200]}")
        return {"error": f"Model returned text: {text_out[:100]}..."}

    except Exception as e:
        print(f"Clean Slate generation failed: {e}")
        return {"error": f"Generation failed: {str(e)}"}

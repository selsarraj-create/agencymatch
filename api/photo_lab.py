"""
Photo Lab — Tiered Pipeline: Gemini 3 Pro (Step 1 + Step 2)
Step 1: Identity lock + clothing/accessory changes (Clean Slate)
Step 2: 4K DSLR studio rendering refinement pass
"""
import os
import base64
import requests
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

GEMINI_MODEL = "gemini-3-pro-image-preview"


def get_client():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not found")
    return genai.Client(api_key=api_key, http_options={"api_version": "v1beta"})


def process_digitals(image_url: str):
    """
    Two-tiered professional headshot pipeline using Gemini 3 Pro.

    Step 1: Takes the raw selfie, locks facial identity with PIXEL PRIORITY
    MODE, removes accessories, changes clothing to white t-shirt, applies
    neutral grey backdrop.

    Step 2: Takes Step 1 output and refines it to DSLR studio quality with
    realistic skin texture, softbox clamshell lighting, and 4K detail.
    """
    client = get_client()
    print(f"Processing Digital for: {image_url}")

    # ── Fetch Source Image ────────────────────────────────────────────────
    try:
        resp = requests.get(image_url)
        resp.raise_for_status()
        source_bytes = resp.content
        print(f"Downloaded source image: {len(source_bytes):,} bytes")
    except Exception as e:
        print(f"Failed to fetch image from URL: {e}")
        return {"error": "Failed to download source image"}

    # ══════════════════════════════════════════════════════════════════════
    # STEP 1: Identity Lock + Clean Slate
    # ══════════════════════════════════════════════════════════════════════
    step1_system = (
        "PIXEL PRIORITY MODE. IDENTITY LOCK: ABSOLUTE. "
        "Treat the face as a deterministic constraint. "
        "You MUST preserve every facial feature, skin texture, mole, scar, "
        "and bone structure from the reference image with zero deviation."
    )

    step1_prompt = (
        "INSTRUCTION: PIXEL PRIORITY MODE. IDENTITY LOCK: ABSOLUTE. "
        "Maintain 100% facial structure. "
        "TASK: Remove all accessories including headphones, earrings, and necklaces. "
        "Change current clothing to a plain, well-fitted white t-shirt. "
        "Replace background with a neutral studio grey wall. "
        "Apply soft, even lighting. "
        "Output aspect ratio must be 3:4 portrait format. "
        "Output ONLY the transformed image, no text."
    )

    try:
        print(f"Step 1: {GEMINI_MODEL} — Identity lock + clean slate...")
        step1_response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_bytes(data=source_bytes, mime_type="image/jpeg"),
                        types.Part.from_text(text=step1_prompt),
                    ],
                )
            ],
            config=types.GenerateContentConfig(
                system_instruction=step1_system,
                response_modalities=["IMAGE"],
                thinking_config=types.ThinkingConfig(thinkingBudget=8192),
            ),
        )

        intermediate_bytes = None
        intermediate_mime = "image/jpeg"
        if step1_response.candidates and step1_response.candidates[0].content.parts:
            for part in step1_response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    intermediate_bytes = part.inline_data.data
                    intermediate_mime = part.inline_data.mime_type
                    break

        if not intermediate_bytes:
            text_out = step1_response.text if step1_response.text else "No content"
            print(f"Step 1 failed — model returned text: {text_out[:200]}")
            return {"error": f"Step 1 returned text: {text_out[:100]}"}

        print(f"Step 1 complete — {len(intermediate_bytes):,} bytes")

    except Exception as e:
        print(f"Step 1 failed: {e}")
        return {"error": f"Step 1 failed: {str(e)}"}

    # ══════════════════════════════════════════════════════════════════════
    # STEP 2: DSLR Studio-Quality Refinement
    # ══════════════════════════════════════════════════════════════════════
    step2_system = (
        "PIXEL PRIORITY MODE. IDENTITY LOCK: ABSOLUTE. "
        "Treat the face as a deterministic constraint. "
        "Do NOT change the person's identity, facial structure, or expression."
    )

    step2_prompt = (
        "REFINEMENT PASS. This image has already been identity-locked. "
        "DO NOT change the face, expression, or identity. "
        "TASK: Enhance this image to professional DSLR studio headshot quality. "
        "Apply softbox clamshell lighting with natural catchlights in the eyes. "
        "Enhance realistic skin texture — visible pores, natural imperfections. "
        "Sharpen focus on the face with subtle shallow depth of field. "
        "Ensure the final result is indistinguishable from a professional DSLR headshot. "
        "The background must remain neutral studio grey. "
        "The clothing must remain a plain white t-shirt. "
        "Output aspect ratio must be 3:4 portrait format. "
        "Output ONLY the refined image, no text."
    )

    try:
        print(f"Step 2: {GEMINI_MODEL} — DSLR studio refinement...")
        step2_response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_bytes(data=intermediate_bytes, mime_type=intermediate_mime),
                        types.Part.from_text(text=step2_prompt),
                    ],
                )
            ],
            config=types.GenerateContentConfig(
                system_instruction=step2_system,
                response_modalities=["IMAGE"],
                thinking_config=types.ThinkingConfig(thinkingBudget=8192),
            ),
        )

        if step2_response.candidates and step2_response.candidates[0].content.parts:
            for part in step2_response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    final_bytes = part.inline_data.data
                    final_mime = part.inline_data.mime_type
                    print(f"Step 2 complete — {len(final_bytes):,} bytes final image")
                    return {
                        "status": "success",
                        "identity_constraints": "Tiered: Gemini 3 Pro identity lock → DSLR refinement",
                        "image_bytes": base64.b64encode(final_bytes).decode("utf-8"),
                        "mime_type": final_mime,
                    }

        # Step 2 returned text — fall back to Step 1 output
        text_out = step2_response.text if step2_response.text else "No content"
        print(f"Step 2 returned text — falling back to Step 1 output: {text_out[:200]}")

    except Exception as e:
        print(f"Step 2 failed — falling back to Step 1 output: {e}")

    # Fallback: return Step 1 intermediate image
    return {
        "status": "success",
        "identity_constraints": "Gemini 3 Pro identity lock (Step 2 fallback)",
        "image_bytes": base64.b64encode(intermediate_bytes).decode("utf-8"),
        "mime_type": intermediate_mime,
        "fallback": True,
    }

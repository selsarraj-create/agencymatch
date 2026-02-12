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


def process_digitals_dual(portrait_url: str, fullbody_url: str):
    """
    Multi-Reference Identity Lock pipeline using Gemini 3 Pro.

    Accepts two reference images:
      - Reference_1 (Portrait): face/identity — absolute constraint
      - Reference_2 (Full Body): body proportions and scale

    Step 1: Gemini 3 Pro merges both references into a single
            full-length model digital with identity lock.
    Step 2: Texture refinement pass for DSLR-quality output.
    """
    client = get_client()
    print(f"[DUAL] Processing — Portrait: {portrait_url}, Body: {fullbody_url}")

    # ── Fetch Both Source Images ──────────────────────────────────────────
    try:
        resp_p = requests.get(portrait_url)
        resp_p.raise_for_status()
        portrait_bytes = resp_p.content
        print(f"[DUAL] Portrait downloaded: {len(portrait_bytes):,} bytes")
    except Exception as e:
        print(f"[DUAL] Failed to fetch portrait: {e}")
        return {"error": "Failed to download portrait image"}

    try:
        resp_b = requests.get(fullbody_url)
        resp_b.raise_for_status()
        body_bytes = resp_b.content
        print(f"[DUAL] Full body downloaded: {len(body_bytes):,} bytes")
    except Exception as e:
        print(f"[DUAL] Failed to fetch full body: {e}")
        return {"error": "Failed to download full body image"}

    # ══════════════════════════════════════════════════════════════════════
    # STEP 1: Multi-Reference Identity Lock
    # ══════════════════════════════════════════════════════════════════════
    step1_system = (
        "ENABLE MULTI-REFERENCE IDENTITY LOCK. "
        "You are receiving TWO reference images. "
        "Reference_1 is the FACE — treat it as a pixel-level deterministic constraint. "
        "Weight Reference_1 (Face) at 100%. Preserve every facial feature, skin texture, "
        "mole, scar, and bone structure with zero deviation. "
        "Reference_2 is the BODY — use it for body proportions, height, build, and scale. "
        "Weight Reference_2 (Body) at 100%. "
        "You MUST merge both references into a single coherent full-length portrait."
    )

    step1_prompt = (
        "INSTRUCTION: ENABLE MULTI-REFERENCE IDENTITY LOCK. "
        "Use Reference_1 (first image) for absolute facial consistency. "
        "Use Reference_2 (second image) for body proportions and scale. "
        "TASK: Transform the subject into a professional full-length model digital. "
        "Change clothing to a plain white well-fitted t-shirt and slim-fit blue jeans. "
        "Remove all accessories (headphones, earrings, necklaces, jewelry). "
        "Use the hair texture from Reference_1 to fill any gaps where accessories were removed. "
        "Background: Clean white studio wall. "
        "Lighting: Professional even softbox lighting. "
        "Output aspect ratio must be 2:3 full-body portrait format. "
        "Output ONLY the transformed image, no text."
    )

    try:
        print(f"[DUAL] Step 1: {GEMINI_MODEL} — Multi-reference identity lock...")
        step1_response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        # Reference_1: Portrait (Face)
                        types.Part.from_text(text="Reference_1 (Face):"),
                        types.Part.from_bytes(data=portrait_bytes, mime_type="image/jpeg"),
                        # Reference_2: Full Body (Proportions)
                        types.Part.from_text(text="Reference_2 (Body):"),
                        types.Part.from_bytes(data=body_bytes, mime_type="image/jpeg"),
                        # Instruction
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
            print(f"[DUAL] Step 1 failed — text: {text_out[:200]}")
            return {"error": f"Step 1 returned text: {text_out[:100]}"}

        print(f"[DUAL] Step 1 complete — {len(intermediate_bytes):,} bytes")

    except Exception as e:
        print(f"[DUAL] Step 1 failed: {e}")
        return {"error": f"Step 1 (Multi-Ref) failed: {str(e)}"}

    # ══════════════════════════════════════════════════════════════════════
    # STEP 2: Texture Refinement — DSLR 4K Quality
    # ══════════════════════════════════════════════════════════════════════
    step2_system = (
        "PIXEL PRIORITY MODE. IDENTITY LOCK: ABSOLUTE. "
        "Do NOT change the person's identity, facial structure, expression, or body proportions. "
        "This image has already been identity-locked from two references."
    )

    step2_prompt = (
        "REFINEMENT PASS. This full-length digital has been identity-locked. "
        "DO NOT change the face, body proportions, clothing, or identity. "
        "TASK: Enhance to 4K DSLR studio quality. "
        "Apply realistic skin texture — visible pores, natural imperfections. "
        "Enhance fabric detail on the white t-shirt and blue jeans — visible weave and stitching. "
        "Apply softbox clamshell lighting with natural catchlights in the eyes. "
        "Sharpen focus on the subject with subtle shallow depth of field. "
        "The background must remain a clean white studio wall. "
        "Output aspect ratio must be 2:3 full-body portrait format. "
        "Output ONLY the refined image, no text."
    )

    try:
        print(f"[DUAL] Step 2: {GEMINI_MODEL} — 4K texture refinement...")
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
                    print(f"[DUAL] Step 2 complete — {len(final_bytes):,} bytes")
                    return {
                        "status": "success",
                        "identity_constraints": "Multi-Ref: face lock (Ref_1) + body (Ref_2) → DSLR refinement",
                        "image_bytes": base64.b64encode(final_bytes).decode("utf-8"),
                        "mime_type": final_mime,
                    }

        text_out = step2_response.text if step2_response.text else "No content"
        print(f"[DUAL] Step 2 returned text — fallback: {text_out[:200]}")

    except Exception as e:
        print(f"[DUAL] Step 2 failed — fallback: {e}")

    # Fallback: return Step 1 output
    return {
        "status": "success",
        "identity_constraints": "Multi-Ref identity lock (Step 2 fallback)",
        "image_bytes": base64.b64encode(intermediate_bytes).decode("utf-8"),
        "mime_type": intermediate_mime,
        "fallback": True,
    }


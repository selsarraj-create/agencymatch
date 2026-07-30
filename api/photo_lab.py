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
AUDIT_MODEL = "gemini-2.5-flash"


def audit_image_quality(image_url: str) -> dict:
    """
    Image Quality Auditor for Model Digital suitability.

    Analyzes brightness, clarity, and facial obstructions.
    Returns: { "score": 1-10, "issues": [...], "can_proceed": bool }
    """
    client = get_client()
    print(f"[AUDIT] Auditing image: {image_url}")

    # ── Fetch image ──────────────────────────────────────────────────
    try:
        resp = requests.get(image_url, timeout=15)
        resp.raise_for_status()
        image_bytes = resp.content
        mime = resp.headers.get("content-type", "image/jpeg").split(";")[0]
        print(f"[AUDIT] Downloaded: {len(image_bytes):,} bytes, {mime}")
    except Exception as e:
        print(f"[AUDIT] Fetch failed: {e}")
        return {"score": 0, "issues": ["fetch_failed"], "can_proceed": False}

    # ── Ask Gemini to audit ──────────────────────────────────────────
    system = (
        "You are an Image Quality Auditor for a model digitals platform. "
        "Analyze the uploaded photo for suitability as a reference image "
        "for AI-generated model digitals. Be LENIENT — if the AI can "
        "identify facial features, the photo is good enough."
    )

    prompt = (
        "Analyze this photo for Model Digital suitability.\n\n"
        "CRITERIA:\n"
        "1. Human Face: Does this image contain a clear human face? "
        "If it is a screenshot, object, animal, meme, or anything "
        "that is NOT a real human photo, immediately return score 0 "
        "with issue 'no_face' and can_proceed false.\n"
        "2. Brightness: Is the face underexposed or too dark?\n"
        "3. Clarity: Is there significant motion blur?\n"
        "4. Obstructions: Is the face clearly visible, or are there "
        "large objects/hands/sunglasses blocking it?\n\n"
        "RULES:\n"
        "- Be lenient. If the photo is 'good enough' for the AI to "
        "identify features, set can_proceed to true even if score is low.\n"
        "- Only set can_proceed to false for truly unusable photos "
        "(no human face, face completely hidden, extreme blur, pitch black).\n\n"
        "Respond with ONLY a valid JSON object, no markdown fences:\n"
        '{ "score": <1-10>, "issues": [<zero or more of: '
        '"no_face", "too_dark", "blurry", "obstructed">], "can_proceed": <true/false> }'
    )

    try:
        response = client.models.generate_content(
            model=AUDIT_MODEL,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_bytes(data=image_bytes, mime_type=mime),
                        types.Part.from_text(text=prompt),
                    ],
                )
            ],
            config=types.GenerateContentConfig(
                system_instruction=system,
                response_modalities=["TEXT"],
            ),
        )

        raw = response.text.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        import json as _json
        result = _json.loads(raw)
        print(f"[AUDIT] Result: score={result.get('score')}, "
              f"issues={result.get('issues')}, "
              f"can_proceed={result.get('can_proceed')}")
        return result

    except Exception as e:
        print(f"[AUDIT] Gemini audit failed: {e}")
        # Fail open — let the user proceed
        return {"score": 5, "issues": [], "can_proceed": True}


def get_client():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not found")
    return genai.Client(api_key=api_key, http_options={"api_version": "v1beta"})


from typing import Union, List, Optional

DEFAULT_SYSTEM_INSTRUCTION = (
    "PIXEL PRIORITY MODE. IDENTITY LOCK: ABSOLUTE. "
    "The face, facial structure, and skin tone in the input image(s) are HARD CONSTRAINTS. "
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

DEFAULT_USER_PROMPT = (
    "A high-resolution composite modeling portfolio grid featuring an exact, 100% recognizable, and accurate likeness of the single subject provided in the input reference image(s). "
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


def process_digitals(
    image_url: Union[str, List[str]] = None,
    secondary_url: str = None,
    reference_urls: List[str] = None,
    custom_system: str = None,
    custom_prompt: str = None,
    thinking_budget: Optional[int] = 2048
):
    """
    Two-tiered professional headshot pipeline using Gemini 3 Pro with multi-image reference feeding.

    Accepts 1, 2, 3, or more reference URLs (frontal, profile, 3/4 view).
    All provided reference images are fed directly to Gemini 3 Pro
    to build an accurate 3D identity anchor. Supports custom system instructions, prompts, and thinking budget.
    """
    client = get_client()

    # Collect all non-empty reference URLs
    urls = []
    if reference_urls and isinstance(reference_urls, list):
        urls.extend([u for u in reference_urls if u])
    if isinstance(image_url, list):
        urls.extend([u for u in image_url if u and u not in urls])
    elif isinstance(image_url, str) and image_url and image_url not in urls:
        urls.append(image_url)

    if secondary_url and secondary_url not in urls:
        urls.append(secondary_url)

    if not urls:
        return {"error": "No reference image URLs provided"}

    print(f"[PHOTO LAB] Processing Digitals using {len(urls)} reference image(s)...")

    # ── Fetch All Source Images ───────────────────────────────────────────
    source_parts = []
    first_bytes = None
    for idx, u in enumerate(urls):
        try:
            if u.startswith("data:"):
                header, b64data = u.split(",", 1)
                mime = header.split(";")[0].replace("data:", "") if ";" in header else "image/jpeg"
                img_bytes = base64.b64decode(b64data)
            else:
                resp = requests.get(u, timeout=15)
                resp.raise_for_status()
                img_bytes = resp.content
                mime = resp.headers.get("content-type", "image/jpeg").split(";")[0]

            if first_bytes is None:
                first_bytes = img_bytes
            mime_type = mime if mime.startswith("image/") else "image/jpeg"
            source_parts.append(types.Part.from_bytes(data=img_bytes, mime_type=mime_type))
            print(f"Loaded reference image #{idx + 1}: {len(img_bytes):,} bytes ({mime_type})")
        except Exception as e:
            print(f"Failed to load reference image #{idx + 1}: {e}")

    if not source_parts:
        return {"error": "Failed to download any reference images"}

    # ══════════════════════════════════════════════════════════════════════
    # SINGLE STEP: Natural Cleanup (Identity-Locked Studio Transform)
    # ══════════════════════════════════════════════════════════════════════
    cleanup_system = custom_system.strip() if custom_system and custom_system.strip() else DEFAULT_SYSTEM_INSTRUCTION
    cleanup_prompt = custom_prompt.strip() if custom_prompt and custom_prompt.strip() else DEFAULT_USER_PROMPT

    budget = int(thinking_budget) if thinking_budget is not None else 2048
    thinking_cfg = types.ThinkingConfig(thinkingBudget=budget) if budget > 0 else None

    try:
        print(f"Cleanup: {GEMINI_MODEL} — Identity-locked studio transform with {len(source_parts)} reference image(s) (ThinkingBudget={budget})...")
        content_parts = source_parts + [types.Part.from_text(text=cleanup_prompt)]

        gen_config = types.GenerateContentConfig(
            system_instruction=cleanup_system,
            response_modalities=["IMAGE"],
        )
        if thinking_cfg:
            gen_config.thinking_config = thinking_cfg

        cleanup_response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                types.Content(
                    role="user",
                    parts=content_parts,
                )
            ],
            config=gen_config,
        )

        if cleanup_response.candidates and cleanup_response.candidates[0].content.parts:
            for part in cleanup_response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    final_bytes = part.inline_data.data
                    final_mime = part.inline_data.mime_type
                    print(f"Cleanup complete — {len(final_bytes):,} bytes")
                    return {
                        "status": "success",
                        "identity_constraints": f"Gemini 3 Pro natural cleanup ({len(source_parts)} refs, thinkingBudget=2048)",
                        "image_bytes": base64.b64encode(final_bytes).decode("utf-8"),
                        "mime_type": final_mime,
                    }

        text_out = cleanup_response.text if cleanup_response.text else "No content"
        print(f"Cleanup returned text instead of image: {text_out[:200]}")
        return {"error": f"AI model returned text instead of image: {text_out[:200]}"}

    except Exception as e:
        print(f"Cleanup failed: {e}")
        return {"error": f"AI generation error: {str(e)}"}

    # Fallback: return the original photo as-is
    return {
        "status": "success",
        "identity_constraints": "Passthrough (cleanup failed)",
        "image_bytes": base64.b64encode(first_bytes).decode("utf-8") if first_bytes else "",
        "mime_type": "image/jpeg",
        "fallback": True,
    }


def process_digitals_dual(
    portrait_url: str = None,
    fullbody_url: str = None,
    reference_urls: List[str] = None,
    custom_system: str = None,
    custom_prompt: str = None
):
    """
    Parallel Generation Pipeline:
    1. Headshot: Uses process_digitals with all available portrait/reference URLs.
    2. Full Body: Passthrough if fullbody_url provided.
    """
    print(f"[DUAL] Starting generation with multi-image reference lock...")

    # Collect all reference URLs
    all_refs = []
    if reference_urls and isinstance(reference_urls, list):
        all_refs.extend([u for u in reference_urls if u])
    if portrait_url and portrait_url not in all_refs:
        all_refs.append(portrait_url)

    headshot_result = process_digitals(
        reference_urls=all_refs,
        secondary_url=fullbody_url,
        custom_system=custom_system,
        custom_prompt=custom_prompt
    )

    # Full Body Passthrough
    fullbody_result = {"status": "success", "identity_constraints": "Passthrough"}
    if fullbody_url:
        try:
            resp = requests.get(fullbody_url, timeout=15)
            resp.raise_for_status()
            raw_body_bytes = resp.content
            fullbody_result["image_bytes"] = base64.b64encode(raw_body_bytes).decode("utf-8")
            fullbody_result["mime_type"] = "image/jpeg"
        except Exception as e:
            print(f"[DUAL] Full body passthrough failed: {e}")
            fullbody_result = {"error": f"Failed to download full body image: {e}"}

    return {
        "status": "success",
        "headshot": headshot_result,
        "fullbody": fullbody_result
    }


def _generate_fullbody_dual(portrait_url: str, fullbody_url: str):
    """
    Private helper: Multi-Reference Identity Lock pipeline for Full Body.
    """
    client = get_client()
    print(f"[DUAL-BODY] Processing — Portrait: {portrait_url}, Body: {fullbody_url}")

    # ── Fetch Both Source Images ──────────────────────────────────────────
    try:
        resp_p = requests.get(portrait_url)
        resp_p.raise_for_status()
        portrait_bytes = resp_p.content
    except Exception as e:
        print(f"[DUAL-BODY] Failed to fetch portrait: {e}")
        return {"error": "Failed to download portrait image"}

    try:
        resp_b = requests.get(fullbody_url)
        resp_b.raise_for_status()
        body_bytes = resp_b.content
    except Exception as e:
        print(f"[DUAL-BODY] Failed to fetch full body: {e}")
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
        print(f"[DUAL-BODY] Step 1: {GEMINI_MODEL} — Multi-reference identity lock...")
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
            print(f"[DUAL-BODY] Step 1 failed — text: {text_out[:200]}")
            return {"error": f"Step 1 returned text: {text_out[:100]}"}

        print(f"[DUAL-BODY] Step 1 complete — {len(intermediate_bytes):,} bytes")

    except Exception as e:
        print(f"[DUAL-BODY] Step 1 failed: {e}")
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
        print(f"[DUAL-BODY] Step 2: {GEMINI_MODEL} — 4K texture refinement...")
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
                    print(f"[DUAL-BODY] Step 2 complete — {len(final_bytes):,} bytes")
                    return {
                        "status": "success",
                        "identity_constraints": "Multi-Ref: face lock (Ref_1) + body (Ref_2) → DSLR refinement",
                        "image_bytes": base64.b64encode(final_bytes).decode("utf-8"),
                        "mime_type": final_mime,
                    }

        text_out = step2_response.text if step2_response.text else "No content"
        print(f"[DUAL-BODY] Step 2 returned text — fallback: {text_out[:200]}")

    except Exception as e:
        print(f"[DUAL-BODY] Step 2 failed — fallback: {e}")

    # Fallback: return Step 1 output
    return {
        "status": "success",
        "identity_constraints": "Multi-Ref identity lock (Step 2 fallback)",
        "image_bytes": base64.b64encode(intermediate_bytes).decode("utf-8"),
        "mime_type": intermediate_mime,
        "fallback": True,
    }


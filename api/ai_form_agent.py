"""
AI Form Agent — Gemini-powered form filling for model agency applications.

3-Phase Pipeline:
  1. snapshot_form(page) → Clean HTML of the form
  2. gemini_map_fields(form_html, user_data) → JSON action plan
  3. execute_actions(page, actions, photo_urls) → Fill + upload + submit
"""

import os
import json
import base64
import logging
import tempfile
import requests as http_requests
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# Phase 1: Snapshot — Extract clean form HTML from the page
# ──────────────────────────────────────────────────────────────────────────────

async def snapshot_form(page) -> dict:
    """
    Extracts all form elements from the current page and returns sanitized HTML.
    Also detects CAPTCHAs and iframes that embed external form providers.
    
    Returns:
        {
            "form_html": str,          # Sanitized form HTML (≤30KB)
            "has_captcha": bool,       # Whether a CAPTCHA was detected
            "has_iframe_form": bool,   # Whether form is inside an iframe
            "iframe_src": str | None,  # Source URL of iframe if detected
            "page_title": str          # Title of the page
        }
    """
    result = await page.evaluate("""() => {
        // Helper: strip attributes we don't need
        function cleanElement(el) {
            const clone = el.cloneNode(true);
            // Remove script and style tags
            clone.querySelectorAll('script, style, noscript, link').forEach(s => s.remove());
            return clone.outerHTML;
        }
        
        // Detect CAPTCHAs
        const hasCaptcha = !!(
            document.querySelector('[class*="captcha"]') ||
            document.querySelector('[class*="recaptcha"]') ||
            document.querySelector('[id*="captcha"]') ||
            document.querySelector('iframe[src*="recaptcha"]') ||
            document.querySelector('iframe[src*="hcaptcha"]') ||
            document.querySelector('.g-recaptcha') ||
            document.querySelector('.h-captcha')
        );
        
        // Detect iframe-embedded forms (Typeform, JotForm, Google Forms, etc.)
        const formIframes = document.querySelectorAll(
            'iframe[src*="typeform"], iframe[src*="jotform"], iframe[src*="google.com/forms"], iframe[src*="airtable"], iframe[src*="wufoo"]'
        );
        const hasIframeForm = formIframes.length > 0;
        const iframeSrc = hasIframeForm ? formIframes[0].getAttribute('src') : null;
        
        // Extract forms
        const forms = document.querySelectorAll('form');
        let formHtml = '';
        
        if (forms.length > 0) {
            // Get the largest form (most likely the application form)
            let largestForm = forms[0];
            for (const f of forms) {
                if (f.innerHTML.length > largestForm.innerHTML.length) {
                    largestForm = f;
                }
            }
            formHtml = cleanElement(largestForm);
        } else {
            // No <form> tag — some sites use divs with inputs
            // Grab all input/select/textarea elements and their labels
            const inputs = document.querySelectorAll('input, select, textarea, button[type="submit"]');
            if (inputs.length > 0) {
                const container = document.createElement('div');
                container.setAttribute('data-note', 'no-form-tag-found');
                
                inputs.forEach(inp => {
                    // Get the label if it exists
                    const id = inp.getAttribute('id');
                    const name = inp.getAttribute('name');
                    const label = id ? document.querySelector(`label[for="${id}"]`) : null;
                    
                    const wrapper = document.createElement('div');
                    if (label) wrapper.appendChild(label.cloneNode(true));
                    wrapper.appendChild(inp.cloneNode(true));
                    container.appendChild(wrapper);
                });
                
                formHtml = container.outerHTML;
            }
        }
        
        return {
            form_html: formHtml,
            has_captcha: hasCaptcha,
            has_iframe_form: hasIframeForm,
            iframe_src: iframeSrc,
            page_title: document.title
        };
    }""")
    
    # Truncate form HTML if too large (Gemini context limit)
    if len(result.get("form_html", "")) > 30000:
        result["form_html"] = result["form_html"][:30000] + "<!-- TRUNCATED -->"
    
    logger.info(f"Snapshot: title='{result['page_title']}', "
                f"form_size={len(result.get('form_html', ''))}B, "
                f"captcha={result['has_captcha']}, "
                f"iframe={result['has_iframe_form']}")
    
    return result


# ──────────────────────────────────────────────────────────────────────────────
# Phase 2: Gemini Mapper — AI maps user data to form fields
# ──────────────────────────────────────────────────────────────────────────────

def gemini_map_fields(form_html: str, user_data: Dict[str, Any]) -> List[Dict]:
    """
    Uses Gemini to analyze the form HTML and map user profile data to form fields.
    
    Returns a JSON action plan:
    [
        {"action": "fill", "selector": "CSS selector", "value": "text value"},
        {"action": "select", "selector": "CSS selector", "value": "option value"},
        {"action": "check", "selector": "CSS selector"},
        {"action": "upload", "selector": "CSS selector", "files": ["headshot", "fullbody"]},
        {"action": "click", "selector": "CSS selector"}
    ]
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not set")
    
    # Build user data summary for the prompt
    user_summary = _build_user_summary(user_data)
    
    prompt = f"""ROLE: You are an expert web automation engineer. Your job is to analyze an HTML form and produce a precise action plan to fill it with the provided user data.

FORM HTML:
```html
{form_html}
```

USER DATA:
{user_summary}

INSTRUCTIONS:
1. Analyze every input, select, textarea, and button in the form.
2. For each field, determine which piece of user data best matches it.
3. Produce a JSON array of actions to fill the form and submit it.
4. Use the MOST SPECIFIC CSS selector possible (prefer #id, then name attribute, then class).
5. For date fields, use the format the form expects (check input type and any placeholder text).
6. For dropdowns/selects, pick the option value that best matches the user data.
7. For checkboxes (like terms/consent), include a "check" action.
8. For file upload inputs, specify which photos to use: "headshot" (first photo), "fullbody" (second photo), or "both".
9. The LAST action should always be the submit button click.
10. If a field has no matching user data, SKIP it (do not include it in the plan).
11. For fields asking about how the user heard about the agency, use "Online Search".
12. For "message" or "about yourself" textareas, write a brief professional introduction using the user data.

OUTPUT: Return ONLY a JSON array. No markdown, no explanation. Example:
[
  {{"action": "fill", "selector": "#first_name", "value": "Jane"}},
  {{"action": "fill", "selector": "input[name='email']", "value": "jane@example.com"}},
  {{"action": "select", "selector": "#gender", "value": "female"}},
  {{"action": "upload", "selector": "input[type='file']", "files": ["headshot", "fullbody"]}},
  {{"action": "check", "selector": "#terms"}},
  {{"action": "click", "selector": "button[type='submit']"}}
]"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "response_mime_type": "application/json"
        }
    }
    
    logger.info("Sending form HTML to Gemini for field mapping...")
    response = http_requests.post(url, json=payload, timeout=30)
    response.raise_for_status()
    
    resp_json = response.json()
    
    try:
        text_content = resp_json['candidates'][0]['content']['parts'][0]['text']
        actions = json.loads(text_content)
        
        if not isinstance(actions, list):
            raise ValueError("Gemini returned non-list response")
        
        logger.info(f"Gemini returned {len(actions)} actions")
        return actions
        
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        logger.error(f"Failed to parse Gemini response: {resp_json}")
        raise ValueError(f"Invalid Gemini response: {e}")


def _build_user_summary(user_data: Dict[str, Any]) -> str:
    """Formats user profile data into a readable summary for Gemini."""
    lines = []
    
    field_map = {
        'first_name': 'First Name',
        'last_name': 'Last Name',
        'email': 'Email',
        'phone_number': 'Phone Number',
        'gender': 'Gender',
        'date_of_birth': 'Date of Birth',
        'height': 'Height',
        'bust_cm': 'Bust/Chest (cm)',
        'waist_cm': 'Waist (cm)',
        'hips_cm': 'Hips (cm)',
        'shoe_size_uk': 'Shoe Size (UK)',
        'eye_color': 'Eye Color',
        'hair_color': 'Hair Color',
    }
    
    for key, label in field_map.items():
        value = user_data.get(key)
        if value:
            lines.append(f"- {label}: {value}")
    
    # Instagram from social_stats
    social = user_data.get('social_stats', {})
    if isinstance(social, dict):
        ig = social.get('instagram') or social.get('instagram_handle')
        if ig:
            lines.append(f"- Instagram: {ig}")
        tt = social.get('tiktok') or social.get('tiktok_handle')
        if tt:
            lines.append(f"- TikTok: {tt}")
    
    # Photos
    photos = user_data.get('generated_photos', [])
    if photos:
        lines.append(f"- Photos Available: {len(photos)} (headshot + full body)")
    
    return "\n".join(lines) if lines else "No user data available."


# ──────────────────────────────────────────────────────────────────────────────
# Phase 3: Execute — Carry out the action plan via Playwright
# ──────────────────────────────────────────────────────────────────────────────

async def execute_actions(
    page,
    actions: List[Dict],
    photo_urls: List[str],
    dry_run: bool = False
) -> Dict[str, Any]:
    """
    Executes the Gemini-generated action plan on the page.
    
    Args:
        page: Playwright page object
        actions: List of action dicts from gemini_map_fields
        photo_urls: List of photo URLs from user's generated_photos
        dry_run: If True, fill but don't click submit
    
    Returns:
        {"status": "success"|"failed", "actions_completed": int, "errors": list}
    """
    completed = 0
    errors = []
    
    for i, action in enumerate(actions):
        action_type = action.get("action")
        selector = action.get("selector")
        
        if not selector:
            errors.append(f"Action {i}: missing selector")
            continue
        
        try:
            if action_type == "fill":
                value = action.get("value", "")
                await _safe_fill(page, selector, str(value))
                completed += 1
                logger.info(f"✅ fill: {selector} = {value[:50]}")
                
            elif action_type == "select":
                value = action.get("value", "")
                await _safe_select(page, selector, str(value))
                completed += 1
                logger.info(f"✅ select: {selector} = {value}")
                
            elif action_type == "check":
                await _safe_check(page, selector)
                completed += 1
                logger.info(f"✅ check: {selector}")
                
            elif action_type == "upload":
                file_types = action.get("files", [])
                await _safe_upload(page, selector, file_types, photo_urls)
                completed += 1
                logger.info(f"✅ upload: {selector} ({file_types})")
                
            elif action_type == "click":
                if dry_run:
                    logger.info(f"🔸 DRY RUN — skipping click: {selector}")
                else:
                    await _safe_click(page, selector)
                    completed += 1
                    logger.info(f"✅ click: {selector}")
            else:
                errors.append(f"Action {i}: unknown type '{action_type}'")
                
        except Exception as e:
            error_msg = f"Action {i} ({action_type} on {selector}): {e}"
            errors.append(error_msg)
            logger.warning(f"⚠️ {error_msg}")
    
    # Wait a moment after submit
    if not dry_run:
        try:
            await page.wait_for_timeout(3000)
        except:
            pass
    
    status = "success" if completed > 0 and len(errors) < len(actions) / 2 else "failed"
    
    return {
        "status": status,
        "actions_completed": completed,
        "actions_total": len(actions),
        "errors": errors
    }


# ──────────────────────────────────────────────────────────────────────────────
# Safe action helpers (with retries and fallbacks)
# ──────────────────────────────────────────────────────────────────────────────

async def _safe_fill(page, selector: str, value: str, timeout: int = 5000):
    """Fill a text input with fallback strategies."""
    try:
        el = page.locator(selector).first
        await el.wait_for(state="visible", timeout=timeout)
        await el.click()
        await el.fill(value)
    except Exception:
        # Fallback: try JavaScript fill
        try:
            await page.evaluate(f"""(data) => {{
                const el = document.querySelector(data.sel);
                if (el) {{
                    el.value = data.val;
                    el.dispatchEvent(new Event('input', {{ bubbles: true }}));
                    el.dispatchEvent(new Event('change', {{ bubbles: true }}));
                }}
            }}""", {"sel": selector, "val": value})
        except Exception as e:
            raise RuntimeError(f"Fill failed for {selector}: {e}")


async def _safe_select(page, selector: str, value: str, timeout: int = 5000):
    """Select an option from a dropdown with fuzzy matching."""
    try:
        el = page.locator(selector).first
        await el.wait_for(state="visible", timeout=timeout)
        
        # Try exact value match first
        try:
            await el.select_option(value=value, timeout=3000)
            return
        except:
            pass
        
        # Try label match (case-insensitive)
        try:
            await el.select_option(label=value, timeout=3000)
            return
        except:
            pass
        
        # Fallback: find closest matching option via JS
        await page.evaluate(f"""(data) => {{
            const sel = document.querySelector(data.sel);
            if (!sel) return;
            const target = data.val.toLowerCase();
            for (const opt of sel.options) {{
                if (opt.text.toLowerCase().includes(target) || 
                    opt.value.toLowerCase().includes(target)) {{
                    sel.value = opt.value;
                    sel.dispatchEvent(new Event('change', {{ bubbles: true }}));
                    break;
                }}
            }}
        }}""", {"sel": selector, "val": value})
        
    except Exception as e:
        raise RuntimeError(f"Select failed for {selector}: {e}")


async def _safe_check(page, selector: str, timeout: int = 5000):
    """Check a checkbox."""
    try:
        el = page.locator(selector).first
        await el.wait_for(state="visible", timeout=timeout)
        if not await el.is_checked():
            await el.check()
    except Exception:
        # Fallback: click it
        try:
            await page.click(selector, timeout=timeout)
        except Exception as e:
            raise RuntimeError(f"Check failed for {selector}: {e}")


async def _safe_click(page, selector: str, timeout: int = 10000):
    """Click an element (usually submit button)."""
    try:
        el = page.locator(selector).first
        await el.wait_for(state="visible", timeout=timeout)
        await el.click()
    except Exception:
        # Fallback: try broader submit button search
        try:
            submit = page.get_by_role("button", name="Submit").or_(
                page.get_by_role("button", name="Apply")).or_(
                page.get_by_role("button", name="Send"))
            await submit.first.click(timeout=timeout)
        except Exception as e:
            raise RuntimeError(f"Click failed for {selector}: {e}")


async def _safe_upload(page, selector: str, file_types: List[str], photo_urls: List[str]):
    """
    Download photos from Supabase URLs, compress, and upload to file input.
    
    file_types: ["headshot"], ["fullbody"], or ["headshot", "fullbody"] / ["both"]
    photo_urls: User's generated_photos array from profile
    """
    if not photo_urls:
        logger.warning("No photos available for upload — skipping")
        return
    
    # Map file types to photo URLs
    files_to_upload = []
    
    for ft in file_types:
        ft_lower = ft.lower()
        if ft_lower in ("headshot", "portrait") and len(photo_urls) > 0:
            files_to_upload.append(photo_urls[0])
        elif ft_lower in ("fullbody", "full_body", "full body") and len(photo_urls) > 1:
            files_to_upload.append(photo_urls[1])
        elif ft_lower == "both":
            files_to_upload.extend(photo_urls[:2])
        elif len(photo_urls) > 0:
            # Default: use first available photo
            files_to_upload.append(photo_urls[0])
    
    if not files_to_upload:
        logger.warning("Could not map file types to available photos")
        return
    
    # Download and compress photos
    local_paths = []
    for url in files_to_upload:
        local_path = await _download_and_compress(url)
        if local_path:
            local_paths.append(local_path)
    
    if not local_paths:
        logger.warning("No photos downloaded successfully — skipping upload")
        return
    
    # Find the file input and upload
    try:
        file_input = page.locator(selector).first
        
        # Check if it accepts multiple files
        accepts_multiple = await file_input.get_attribute("multiple")
        
        if accepts_multiple and len(local_paths) > 1:
            await file_input.set_input_files(local_paths)
        else:
            # Upload one at a time or just the first
            await file_input.set_input_files(local_paths[0])
            
        logger.info(f"Uploaded {len(local_paths)} photo(s) to {selector}")
        
    except Exception as e:
        # Fallback: find any visible file input
        try:
            fallback = page.locator("input[type='file']").first
            await fallback.set_input_files(local_paths[0])
            logger.info(f"Uploaded via fallback file input")
        except Exception as e2:
            raise RuntimeError(f"Upload failed: {e2}")
    finally:
        # Clean up temp files
        for p in local_paths:
            try:
                os.remove(p)
            except:
                pass


async def _download_and_compress(url: str, max_size_kb: int = 300) -> Optional[str]:
    """Downloads an image from URL and compresses it to ≤ max_size_kb."""
    try:
        response = http_requests.get(url, timeout=20)
        response.raise_for_status()
        
        # Save to temp file
        suffix = ".jpg"
        tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
        tmp.write(response.content)
        tmp.close()
        
        # Compress with Pillow if available
        try:
            from PIL import Image
            img = Image.open(tmp.name)
            img = img.convert("RGB")
            
            # Resize if very large
            max_dim = 1200
            if max(img.size) > max_dim:
                ratio = max_dim / max(img.size)
                new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
                img = img.resize(new_size, Image.LANCZOS)
            
            output_path = tmp.name.replace(suffix, "_compressed.jpg")
            quality = 85
            img.save(output_path, "JPEG", quality=quality)
            
            # Reduce quality until under limit
            while os.path.getsize(output_path) > max_size_kb * 1024 and quality > 20:
                quality -= 10
                img.save(output_path, "JPEG", quality=quality)
            
            os.remove(tmp.name)  # Clean original
            logger.info(f"Compressed image: {os.path.getsize(output_path)/1024:.0f}KB (q={quality})")
            return output_path
            
        except ImportError:
            logger.warning("Pillow not available — using uncompressed image")
            return tmp.name
            
    except Exception as e:
        logger.error(f"Failed to download image from {url}: {e}")
        return None

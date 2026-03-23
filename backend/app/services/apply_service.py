"""
Apply Service — Orchestrates agency application via AI Form Agent + Browserless.

Replaces the old heuristic approach with a Gemini-powered 3-phase pipeline.
"""

import os
import logging
import asyncio
from typing import Dict, Any, Optional
from playwright.async_api import async_playwright

from api.ai_form_agent import snapshot_form, gemini_map_fields, execute_actions

logger = logging.getLogger(__name__)


async def apply_to_agency(
    agency_url: str,
    user_data: Dict[str, Any],
    dry_run: bool = False
) -> Dict[str, Any]:
    """
    Orchestrates the full application process for a single agency.
    
    1. Connect to Browserless (Railway)
    2. Navigate to agency application URL
    3. Snapshot the form HTML
    4. Send to Gemini for field mapping
    5. Execute the action plan (fill + upload + submit)
    6. Take proof screenshot
    
    Args:
        agency_url: The agency's application page URL
        user_data: Full user profile dict from Supabase
        dry_run: If True, fill the form but don't submit
    
    Returns:
        {
            "status": "applied" | "failed" | "captcha_blocked",
            "screenshot": bytes | None,
            "actions_completed": int,
            "actions_total": int,
            "errors": list
        }
    """
    browser = None
    playwright_instance = None
    
    try:
        playwright_instance = await async_playwright().start()
        browser = await _connect_browser(playwright_instance)
        
        # Create context with stealth settings
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/121.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1920, "height": 1080},
            timezone_id="Europe/London",
            locale="en-GB"
        )
        
        page = await context.new_page()
        
        # ── Phase 0: Navigate ──
        logger.info(f"🌐 Navigating to {agency_url}")
        await page.goto(agency_url, timeout=60000, wait_until="domcontentloaded")
        
        # Give JS frameworks time to render
        await page.wait_for_timeout(2000)
        
        # ── Phase 1: Snapshot ──
        logger.info("📸 Phase 1: Snapshotting form...")
        snapshot = await snapshot_form(page)
        
        # Handle edge cases
        if snapshot.get("has_captcha"):
            logger.warning("🛑 CAPTCHA detected — aborting")
            screenshot = await page.screenshot(full_page=True)
            return {
                "status": "captcha_blocked",
                "screenshot": screenshot,
                "actions_completed": 0,
                "actions_total": 0,
                "errors": ["CAPTCHA detected on form page"]
            }
        
        if snapshot.get("has_iframe_form"):
            # Try navigating directly to the iframe source
            iframe_src = snapshot.get("iframe_src")
            if iframe_src:
                logger.info(f"📎 Form is inside iframe, navigating to: {iframe_src}")
                await page.goto(iframe_src, timeout=60000, wait_until="domcontentloaded")
                await page.wait_for_timeout(2000)
                snapshot = await snapshot_form(page)
        
        form_html = snapshot.get("form_html", "")
        if not form_html or len(form_html) < 50:
            logger.warning("⚠️ No form found on page")
            screenshot = await page.screenshot(full_page=True)
            return {
                "status": "failed",
                "screenshot": screenshot,
                "actions_completed": 0,
                "actions_total": 0,
                "errors": ["No form found on the application page"]
            }
        
        # ── Phase 2: Gemini Mapping ──
        logger.info("🧠 Phase 2: Gemini field mapping...")
        try:
            actions = gemini_map_fields(form_html, user_data)
        except Exception as e:
            logger.error(f"Gemini mapping failed: {e}")
            # Retry once
            try:
                logger.info("Retrying Gemini mapping...")
                actions = gemini_map_fields(form_html, user_data)
            except Exception as e2:
                screenshot = await page.screenshot(full_page=True)
                return {
                    "status": "failed",
                    "screenshot": screenshot,
                    "actions_completed": 0,
                    "actions_total": 0,
                    "errors": [f"AI field mapping failed: {e2}"]
                }
        
        if not actions:
            screenshot = await page.screenshot(full_page=True)
            return {
                "status": "failed",
                "screenshot": screenshot,
                "actions_completed": 0,
                "actions_total": 0,
                "errors": ["Gemini returned empty action plan"]
            }
        
        # ── Phase 3: Execute ──
        logger.info(f"⚡ Phase 3: Executing {len(actions)} actions (dry_run={dry_run})")
        photo_urls = user_data.get("generated_photos", [])
        result = await execute_actions(page, actions, photo_urls, dry_run=dry_run)
        
        # Take proof screenshot
        logger.info("📷 Taking proof screenshot...")
        screenshot = await page.screenshot(full_page=True)
        
        # Map status
        if result["status"] == "success":
            final_status = "applied" if not dry_run else "dry_run_complete"
        else:
            final_status = "failed"
        
        return {
            "status": final_status,
            "screenshot": screenshot,
            "actions_completed": result["actions_completed"],
            "actions_total": result["actions_total"],
            "errors": result["errors"]
        }
        
    except Exception as e:
        logger.error(f"❌ Application failed: {e}", exc_info=True)
        
        # Try to get a screenshot even on failure
        screenshot = None
        try:
            if page:
                screenshot = await page.screenshot(full_page=True)
        except:
            pass
        
        return {
            "status": "failed",
            "screenshot": screenshot,
            "actions_completed": 0,
            "actions_total": 0,
            "errors": [str(e)]
        }
        
    finally:
        if browser:
            await browser.close()
        if playwright_instance:
            await playwright_instance.stop()


async def _connect_browser(playwright):
    """
    Connect to Browserless (Railway) or fall back to local Chromium.
    
    Priority:
    1. BROWSERLESS_TOKEN (Browserless.io SFO) 
    2. BROWSERLESS_URL (Self-hosted on Railway)
    3. Local Chromium (dev only)
    """
    # Option 1: Browserless.io hosted
    token = os.getenv("BROWSERLESS_TOKEN")
    if token:
        ws_url = f"wss://production-sfo.browserless.io/chromium/playwright?token={token}&proxy=residential"
        logger.info(f"🔗 Connecting to Browserless.io (SFO)...")
        browser = await playwright.chromium.connect_over_cdp(ws_url)
        logger.info("✅ Connected to Browserless.io")
        return browser
    
    # Option 2: Self-hosted Browserless on Railway
    browserless_url = os.getenv("BROWSERLESS_URL")
    if browserless_url:
        ws_url = f"{browserless_url}/chromium/playwright"
        logger.info(f"🔗 Connecting to self-hosted Browserless: {ws_url}")
        browser = await playwright.chromium.connect_over_cdp(ws_url)
        logger.info("✅ Connected to self-hosted Browserless")
        return browser
    
    # Option 3: Local fallback (dev only)
    logger.warning("⚠️ No Browserless config found — using local Chromium (dev mode)")
    browser = await playwright.chromium.launch(
        headless=True,
        args=["--disable-blink-features=AutomationControlled"]
    )
    return browser

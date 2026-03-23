"""
Apply Engine — Orchestrates agency application via AI Form Agent + Browserless.

This module lives in /api/ alongside server.py so imports resolve cleanly on Railway.
It replaces the old heuristic approach in backend/app/services/apply_service.py.
"""

import os
import logging
from typing import Dict, Any
from playwright.async_api import async_playwright

from ai_form_agent import snapshot_form, gemini_map_fields, execute_actions

logger = logging.getLogger(__name__)


async def apply_to_agency(
    agency_url: str,
    user_data: Dict[str, Any],
    dry_run: bool = False
) -> Dict[str, Any]:
    """
    Full application pipeline for a single agency.
    
    1. Connect to Browserless
    2. Navigate to agency application URL
    3. Snapshot form HTML
    4. Gemini maps user data → form fields
    5. Execute plan (fill + upload + submit)
    6. Return proof screenshot bytes
    
    Returns:
        {
            "status": "applied" | "failed" | "captcha_blocked" | "dry_run_complete",
            "screenshot": bytes | None,
            "actions_completed": int,
            "actions_total": int,
            "errors": list[str]
        }
    """
    browser = None
    pw = None
    page = None
    
    try:
        pw = await async_playwright().start()
        browser = await _connect_browser(pw)
        
        # Stealth context
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
        await page.wait_for_timeout(2000)  # Let JS render
        
        # ── Phase 1: Snapshot ──
        logger.info("📸 Phase 1: Snapshotting form...")
        snapshot = await snapshot_form(page)
        
        # CAPTCHA check
        if snapshot.get("has_captcha"):
            logger.warning("🛑 CAPTCHA detected — aborting")
            ss = await page.screenshot(full_page=True)
            return _result("captcha_blocked", ss, errors=["CAPTCHA detected"])
        
        # Iframe check — try navigating directly
        if snapshot.get("has_iframe_form") and snapshot.get("iframe_src"):
            logger.info(f"📎 Form in iframe → {snapshot['iframe_src']}")
            await page.goto(snapshot["iframe_src"], timeout=60000, wait_until="domcontentloaded")
            await page.wait_for_timeout(2000)
            snapshot = await snapshot_form(page)
        
        form_html = snapshot.get("form_html", "")
        if not form_html or len(form_html) < 50:
            logger.warning("⚠️ No form found on page")
            ss = await page.screenshot(full_page=True)
            return _result("failed", ss, errors=["No form found on the application page"])
        
        # ── Phase 2: Gemini Mapping ──
        logger.info("🧠 Phase 2: Gemini field mapping...")
        actions = None
        last_error = None
        
        for attempt in range(2):  # Retry once
            try:
                actions = gemini_map_fields(form_html, user_data)
                break
            except Exception as e:
                last_error = e
                logger.warning(f"Gemini attempt {attempt + 1} failed: {e}")
        
        if not actions:
            ss = await page.screenshot(full_page=True)
            return _result("failed", ss, errors=[f"AI field mapping failed: {last_error}"])
        
        # ── Phase 3: Execute ──
        logger.info(f"⚡ Phase 3: Executing {len(actions)} actions (dry_run={dry_run})")
        photo_urls = user_data.get("generated_photos", [])
        result = await execute_actions(page, actions, photo_urls, dry_run=dry_run)
        
        # Proof screenshot
        logger.info("📷 Taking proof screenshot...")
        ss = await page.screenshot(full_page=True)
        
        if result["status"] == "success":
            status = "dry_run_complete" if dry_run else "applied"
        else:
            status = "failed"
        
        return _result(status, ss, result["actions_completed"], result["actions_total"], result["errors"])
        
    except Exception as e:
        logger.error(f"❌ Application failed: {e}", exc_info=True)
        
        ss = None
        try:
            if page:
                ss = await page.screenshot(full_page=True)
        except:
            pass
        
        return _result("failed", ss, errors=[str(e)])
        
    finally:
        if browser:
            await browser.close()
        if pw:
            await pw.stop()


def _result(status, screenshot=None, completed=0, total=0, errors=None):
    """Construct a standard result dict."""
    return {
        "status": status,
        "screenshot": screenshot,
        "actions_completed": completed,
        "actions_total": total,
        "errors": errors or []
    }


async def _connect_browser(pw):
    """
    Connect to Browserless or fall back to local Chromium.
    
    Priority:
    1. BROWSERLESS_TOKEN → Browserless.io (SFO)
    2. BROWSERLESS_URL  → Self-hosted (Railway)
    3. Local Chromium    → Dev only
    """
    token = os.getenv("BROWSERLESS_TOKEN")
    if token:
        ws = f"wss://production-sfo.browserless.io/chromium/playwright?token={token}&proxy=residential"
        logger.info("🔗 Connecting to Browserless.io (SFO)...")
        return await pw.chromium.connect_over_cdp(ws)
    
    url = os.getenv("BROWSERLESS_URL")
    if url:
        ws = f"{url}/chromium/playwright"
        logger.info(f"🔗 Connecting to self-hosted Browserless: {ws}")
        return await pw.chromium.connect_over_cdp(ws)
    
    logger.warning("⚠️ No Browserless — using local Chromium (dev)")
    return await pw.chromium.launch(
        headless=True,
        args=["--disable-blink-features=AutomationControlled"]
    )

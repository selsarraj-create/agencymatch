"""
Dry-run test of the AI form-filling pipeline against Edge Talent's test form.
"""
import asyncio
import os
import sys
import json
import logging

# Add the api directory to the path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(levelname)s | %(message)s')
logger = logging.getLogger(__name__)

# Import our modules
from ai_form_agent import snapshot_form, gemini_map_fields, execute_actions

async def main():
    from playwright.async_api import async_playwright
    
    # Simulated user profile data (matching the DB schema)
    user_data = {
        "first_name": "Jane",
        "last_name": "Doe",
        "email": "jane.doe.test@example.com",
        "phone_number": "+447123456789",
        "gender": "Female",
        "date_of_birth": "2000-05-15",
        "height": "5'9\"",
        "bust_cm": "86",
        "waist_cm": "62",
        "hips_cm": "90",
        "shoe_size_uk": "7",
        "eye_color": "Brown",
        "hair_color": "Brunette",
        "social_stats": {"instagram": "@janedoe_test"},
        "generated_photos": []  # No photos for test
    }
    
    agency_url = "https://edgetalent.co.uk/agency-test/"

    pw = await async_playwright().start()
    browser = await pw.chromium.launch(headless=True)
    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        viewport={"width": 1920, "height": 1080}
    )
    page = await context.new_page()

    try:
        # Phase 0: Navigate
        print(f"\n{'='*60}")
        print(f"🌐 NAVIGATING to {agency_url}")
        print(f"{'='*60}")
        await page.goto(agency_url, timeout=60000, wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)
        print(f"✅ Page loaded: {await page.title()}")

        # Phase 1: Snapshot
        print(f"\n{'='*60}")
        print(f"📸 PHASE 1: Snapshotting form...")
        print(f"{'='*60}")
        snapshot = await snapshot_form(page)
        
        form_html = snapshot.get("form_html", "")
        print(f"  Page title: {snapshot['page_title']}")
        print(f"  Form HTML size: {len(form_html)} bytes")
        print(f"  CAPTCHA detected: {snapshot['has_captcha']}")
        print(f"  Iframe form: {snapshot['has_iframe_form']}")
        
        if not form_html or len(form_html) < 50:
            print("❌ No form found on page!")
            await page.screenshot(path="/tmp/no_form.png", full_page=True)
            print("Screenshot saved to /tmp/no_form.png")
            return
        
        # Save the form HTML for inspection
        with open("/tmp/form_snapshot.html", "w") as f:
            f.write(form_html)
        print(f"  📄 Form HTML saved to /tmp/form_snapshot.html")

        # Phase 2: Gemini Mapping
        print(f"\n{'='*60}")
        print(f"🧠 PHASE 2: Gemini field mapping...")
        print(f"{'='*60}")
        
        actions = gemini_map_fields(form_html, user_data)
        
        print(f"\n📋 Action Plan ({len(actions)} actions):")
        for i, action in enumerate(actions):
            a_type = action.get("action")
            selector = action.get("selector", "N/A")
            value = action.get("value", "")
            files = action.get("files", [])
            
            if a_type == "fill":
                print(f"  {i+1}. FILL   {selector} = \"{value}\"")
            elif a_type == "select":
                print(f"  {i+1}. SELECT {selector} = \"{value}\"")
            elif a_type == "check":
                print(f"  {i+1}. CHECK  {selector}")
            elif a_type == "upload":
                print(f"  {i+1}. UPLOAD {selector} files={files}")
            elif a_type == "click":
                print(f"  {i+1}. CLICK  {selector}")
            else:
                print(f"  {i+1}. ???    {action}")
        
        # Save action plan
        with open("/tmp/action_plan.json", "w") as f:
            json.dump(actions, f, indent=2)
        print(f"\n  📄 Action plan saved to /tmp/action_plan.json")

        # Phase 3: Execute (DRY RUN — no submit)
        print(f"\n{'='*60}")
        print(f"⚡ PHASE 3: Executing actions (DRY RUN)...")
        print(f"{'='*60}")
        
        result = await execute_actions(page, actions, user_data.get("generated_photos", []), dry_run=True)
        
        print(f"\n📊 Results:")
        print(f"  Status: {result['status']}")
        print(f"  Actions completed: {result['actions_completed']}/{result['actions_total']}")
        if result['errors']:
            print(f"  Errors:")
            for err in result['errors']:
                print(f"    ⚠️ {err}")
        
        # Take proof screenshot
        screenshot_path = "/tmp/dry_run_proof.png"
        await page.screenshot(path=screenshot_path, full_page=True)
        print(f"\n📷 Proof screenshot saved to {screenshot_path}")
        
        print(f"\n{'='*60}")
        print(f"{'✅ DRY RUN COMPLETE' if result['status'] == 'success' else '❌ DRY RUN FAILED'}")
        print(f"{'='*60}")

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        
        try:
            await page.screenshot(path="/tmp/error_screenshot.png", full_page=True)
            print("Screenshot saved to /tmp/error_screenshot.png")
        except:
            pass
    
    finally:
        await browser.close()
        await pw.stop()

if __name__ == "__main__":
    asyncio.run(main())

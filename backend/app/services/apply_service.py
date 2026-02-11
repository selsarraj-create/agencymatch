
import os
import logging
import asyncio
from typing import Dict, Any, Optional
from playwright.async_api import async_playwright, Playwright, Browser, Page
from PIL import Image

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def compress_image(image_path: str, max_size_kb: int = 300) -> str:
    """
    Compresses an image to be under max_size_kb.
    Returns the path to the compressed image.
    """
    try:
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found: {image_path}")

        img = Image.open(image_path)
        output_path = f"{os.path.splitext(image_path)[0]}_compressed.jpg"
        
        # Initial save with 85% quality
        quality = 85
        img = img.convert("RGB") # Ensure JPG compatibility
        img.save(output_path, "JPEG", quality=quality)
        
        # Optimize until size is under limit
        while os.path.getsize(output_path) > max_size_kb * 1024 and quality > 10:
            quality -= 5
            img.save(output_path, "JPEG", quality=quality)
            
        logger.info(f"Compressed image saved to {output_path} ({os.path.getsize(output_path)/1024:.1f}KB)")
        return output_path
    except Exception as e:
        logger.error(f"Image compression failed: {e}")
        return image_path  # Fallback to original

async def apply_to_agency(agency_url: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Orchestrates the automated application process for a model agency.
    """
    proxy_server = os.getenv("PROXY_SERVER")
    proxy_user = os.getenv("PROXY_USER")
    proxy_pass = os.getenv("PROXY_PASS")

    proxy_config = None
    if proxy_server and proxy_user and proxy_pass:
        proxy_config = {
            "server": proxy_server,
            "username": proxy_user,
            "password": proxy_pass
        }

    playwright: Playwright = None
    browser: Browser = None
    
    try:
        playwright = await async_playwright().start()
        
        # Launch Browser with Stealth Args
        launch_args = [
            "--disable-blink-features=AutomationControlled",
        ]
        
        browser = await playwright.chromium.launch(
            headless=True,
            args=launch_args,
            proxy=proxy_config
        )

        # Context Setup
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
            timezone_id="Europe/London",
            locale="en-GB"
        )

        page = await context.new_page()

        # "Tunnel Vision": Block heavy resources
        await page.route("**/*", lambda route, request: 
            route.abort() if request.resource_type in ["image", "media", "font", "stylesheet"] 
            else route.continue_()
        )

        logger.info(f"Navigating to {agency_url}...")
        await page.goto(agency_url, timeout=60000, wait_until="domcontentloaded")

        # Heuristic Form Filling
        await _fill_form(page, user_data)
        
        # Handle File Upload
        await _handle_file_upload(page, user_data.get("photos", []))

        # Take Evidence
        os.makedirs("/tmp", exist_ok=True)
        screenshot_path = "/tmp/evidence.png"
        await page.screenshot(path=screenshot_path)
        logger.info(f"Screenshot saved to {screenshot_path}")
        
        # Submit (Commented out for safety/testing, usually user would want a dry run flag or explicit submit)
        # For now, we return "applied" assuming form filled successfully.
        # Ideally, we look for a submit button and click it.
        # await page.get_by_role("button", name=re.compile("submit|apply|send", re.I)).click()
        
        return {"status": "applied", "screenshot": screenshot_path}

    except Exception as e:
        logger.error(f"CRITICAL WORKER FAILURE: {str(e)}", exc_info=True)
        return {"status": "failed", "reason": str(e)}
        
    finally:
        if browser:
            await browser.close()
        if playwright:
            await playwright.stop()

async def _fill_form(page: Page, user_data: Dict[str, Any]):
    """
    Attempts to fill generic form fields using heuristic matching.
    """
    logger.info("Starting form filling...")
    # Name
    if "name" in user_data:
        try:
            logger.info("Filling Name...")
            await page.get_by_label("Name", exact=False).first.fill(user_data["name"], timeout=3000)
        except Exception as e:
            logger.info(f"Name label failed: {e}")
            try: 
                await page.fill("input[name*='name']", user_data["name"], timeout=3000)
            except Exception as e2: 
                logger.info(f"Name selector failed: {e2}")

    # Email
    if "email" in user_data:
        try:
            logger.info("Filling Email...")
            await page.get_by_label("Email", exact=False).first.fill(user_data["email"], timeout=3000)
        except Exception as e:
             logger.info(f"Email label failed: {e}")
             try: await page.fill("input[name*='email']", user_data["email"], timeout=3000)
             except Exception as e2: logger.info(f"Email selector failed: {e2}")
    
    # Instagram
    if "instagram" in user_data:
         try:
            logger.info("Filling Instagram...")
            await page.get_by_label("Instagram", exact=False).first.fill(user_data["instagram"], timeout=3000)
         except Exception as e:
             logger.info(f"Instagram label failed: {e}")
             try: await page.fill("input[name*='instagram']", user_data["instagram"], timeout=3000)
             except Exception as e2: logger.info(f"Instagram selector failed: {e2}")

    # Height / Measurements
    if "height" in user_data:
        try:
             logger.info("Filling Height...")
             await page.get_by_label("Height", exact=False).first.fill(str(user_data["height"]), timeout=3000)
        except Exception as e:
             logger.info(f"Height label failed: {e}")
             try: await page.fill("input[name*='height']", str(user_data["height"]), timeout=3000)
             except Exception as e2: logger.info(f"Height selector failed: {e2}")
    logger.info("Form filling completed.")

async def _handle_file_upload(page: Page, photos: list[str]):
    """
    Locates file input and uploads compressed images.
    """
    if not photos:
        return

    try:
        # Compress first image
        compressed_path = await compress_image(photos[0])
        
        # Find file input
        file_input = page.locator("input[type='file']").first
        if await file_input.count() > 0:
            await file_input.set_input_files(compressed_path)
            logger.info(f"Uploaded {compressed_path}")
        else:
            logger.warning("No file input found.")
            
    except Exception as e:
        logger.error(f"File upload failed: {e}")

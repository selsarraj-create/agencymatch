
import asyncio
import os
import logging
from playwright.async_api import async_playwright
from dotenv import load_dotenv

# Load env vars from .env file
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ProxyTest")

async def main():
    logger.info("🕵️‍♂️ Starting Proxy Verification...")

    # 1. Check Credentials
    server = os.getenv("PROXY_SERVER")
    user = os.getenv("PROXY_USER")
    password = os.getenv("PROXY_PASS")

    if not server or not user or not password:
        logger.error("❌ Missing Proxy Credentials in .env file!")
        logger.info("Please verify PROXY_SERVER, PROXY_USER, and PROXY_PASS are set.")
        return

    logger.info(f"✅ Credentials found for server: {server}")

    # 2. Configure Proxy
    proxy_config = {
        "server": server,
        "username": user,
        "password": password
    }

    async with async_playwright() as p:
        # 3. Launch with Proxy
        logger.info("🚀 Launching Browser with Proxy...")
        try:
            browser = await p.chromium.launch(
                headless=True,
                proxy=proxy_config
            )
            
            context = await browser.new_context()
            page = await context.new_page()

            # 4. Check IP
            logger.info("🌍 Checking Public IP via httpbin.org/ip...")
            await page.goto("https://httpbin.org/ip", timeout=30000)
            
            content = await page.content()
            logger.info(f"📄 Response: {await page.locator('body').inner_text()}")
            
            await browser.close()
            logger.info("✅ Proxy Test Completed Successfully!")
            
        except Exception as e:
            logger.error(f"❌ Proxy Connection Failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())

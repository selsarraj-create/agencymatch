import asyncio
import os
import json
from playwright.async_api import async_playwright
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# Supabase Setup
url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('BACKEND_SERVICE_KEY')

if not url or not key:
    raise ValueError("Missing Supabase Credentials")

supabase = create_client(url, key)

# Browserless Config (Loaded in process_submission)

async def process_submission(submission_id, lead_data, agency_url):
    """
    Executes the Playwright script to submit a lead to an agency.
    """
    print(f"Processing submission {submission_id} for {agency_url}")
    
    # Update status to processing
    supabase.table('agency_submissions').update({'status': 'processing'}).eq('id', submission_id).execute()

    try:
        async with async_playwright() as p:
    try:
        async with async_playwright() as p:
            # Connect to Browserless - STRICT MODE (No local fallback)
            token = os.getenv('BROWSERLESS_TOKEN')
            if not token:
                 raise ValueError("Missing BROWSERLESS_TOKEN env var")
                 
            print(f"Connecting to Browserless (SFO)...")
            # Using specific pattern requested by user
            browserless_ws = f"wss://production-sfo.browserless.io/playwright?token={token}&proxy=residential"
            browser = await p.chromium.connect_over_cdp(browserless_ws)
            
            context = await browser.new_context()
            page = await context.new_page()

            # 1. Navigation
            await page.goto(agency_url, timeout=60000)
            print("Navigated to agency page")
            
            # 2. Form Filling Logic (Mapping lead_data)
            # This is a generic filler - in production, need specific selectors for each agency
            
            # Example: Name
            if await page.is_visible('input[name="first_name"]'):
                await page.fill('input[name="first_name"]', lead_data.get('first_name', ''))
            if await page.is_visible('input[name="last_name"]'):
                await page.fill('input[name="last_name"]', lead_data.get('last_name', ''))
            if await page.is_visible('input[name="email"]'):
                await page.fill('input[name="email"]', lead_data.get('email', ''))

            # 3. Take Screenshot (Proof)
            print("Taking proof screenshot...")
            screenshot_bytes = await page.screenshot(full_page=True)
            
            # Upload Screenshot to Supabase Storage
            filename = f"proof_{submission_id}.jpg"
            supabase.storage.from_("lead-images").upload(
                path=filename,
                file=screenshot_bytes,
                file_options={"content-type": "image/jpeg"}
            )
            
            public_url = f"{url}/storage/v1/object/public/lead-images/{filename}"

            # 4. Mark Success
            supabase.table('agency_submissions').update({
                'status': 'success',
                'proof_screenshot_url': public_url
            }).eq('id', submission_id).execute()
            
            print(f"Submission {submission_id} Success!")
            return True

    except Exception as e:
        print(f"Submission Failed: {e}")
        await capture_failure(submission_id, str(e))
        return False
    finally:
        if browser:
            await browser.close()

async def capture_failure(submission_id, error_msg):
    """
    Log failure and refund credit.
    """
    # 1. Update Status
    supabase.table('agency_submissions').update({
        'status': 'failed',
        'error_message': error_msg
    }).eq('id', submission_id).execute()
    
    # 2. Refund Credit
    # Get user_id from submission
    sub = supabase.table('agency_submissions').select('user_id').eq('id', submission_id).execute()
    if sub.data:
        user_id = sub.data[0]['user_id']
        
        # Increment Credit
        # Note: In real app, make this atomic
        prof = supabase.table('profiles').select('credits').eq('id', user_id).execute()
        current = prof.data[0]['credits']
        supabase.table('profiles').update({'credits': current + 1}).eq('id', user_id).execute()
        
        # Log Transaction
        supabase.table('transactions').insert({
            'user_id': user_id,
            'amount': 1,
            'type': 'refund',
            'description': f"Refund for failed submission {submission_id}"
        }).execute()
        print(f"Refunded 1 credit to {user_id}")

if __name__ == "__main__":
    # Test runner or worker loop
    print("Worker initialized. Run logic here or via API trigger.")

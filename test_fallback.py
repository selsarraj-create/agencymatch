from playwright.sync_api import sync_playwright
import sys
import os

# Add scripts dir to path
sys.path.append(os.path.join(os.getcwd(), 'scripts'))
from agency_hunter import scrape_agency_details

TEST_URLS = [
    "https://www.elitemodel.co.uk",
    "https://www.premiermodelmanagement.com",
    "https://www.nevsmodels.co.uk"
]

def test_fallback():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Create a context that matches the main script
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()
        
        for url in TEST_URLS:
            print(f"\nTesting {url}...")
            data = scrape_agency_details(page, url)
            if data:
                print(f"  Name: {data['name']}")
                print(f"  App URL: {data['application_url']}")
            else:
                print("  Failed to scrape.")
        
        browser.close()

if __name__ == "__main__":
    test_fallback()

from playwright.sync_api import sync_playwright
import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'scripts'))
from agency_hunter import scrape_agency_details

TEST_URLS = [
    "https://www.models1.co.uk",
    "https://www.premiermodelmanagement.com",
    "https://www.zebedeetalent.com" # Specific types
]

def test_dashboard_data():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()
        
        for url in TEST_URLS:
            print(f"\nTesting {url}...")
            data = scrape_agency_details(page, url)
            if data:
                print(f"  Name: {data['name']}")
                print(f"  Logo: {data.get('logo_url')}")
                print(f"  Types: {data.get('modeling_types')}")
            else:
                print("  Failed to scrape.")
        
        browser.close()

if __name__ == "__main__":
    test_dashboard_data()

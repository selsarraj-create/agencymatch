from playwright.sync_api import sync_playwright
import sys
import os

# Add scripts dir to path to import the function
sys.path.append(os.path.join(os.getcwd(), 'scripts'))
from agency_hunter import scrape_agency_details

TEST_URLS = [
    "https://www.elitemodel.co.uk",
    "https://www.premiermodelmanagement.com",
    "https://www.selectmodel.com/london",
    "https://www.wilhelmina.com/london",
    "https://www.nevsmodels.co.uk"
]

def test_logic():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
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
    test_logic()

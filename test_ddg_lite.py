from playwright.sync_api import sync_playwright
import time

def test_lite():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(
             user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        
        q = "site:elitemodel.co.uk apply become a model"
        url = f"https://lite.duckduckgo.com/lite/?q={q.replace(' ', '+')}"
        print(f"Visiting {url}")
        
        try:
            page.goto(url, timeout=10000)
            # Lite DDG results usually are in table items
            # Selectors: .result-link
            links = page.locator('.result-link').all()
            print(f"Found {len(links)} links")
            
            for link in links[:3]:
                print(f"  {link.get_attribute('href')}")
                
        except Exception as e:
            print(f"Error: {e}")
            
        browser.close()

if __name__ == "__main__":
    test_lite()

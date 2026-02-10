from playwright.sync_api import sync_playwright
import time

def debug_ddg():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(
             user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        
        q = "site:elitemodel.co.uk apply become a model"
        url = f"https://duckduckgo.com/?q={q.replace(' ', '+')}&t=h_&ia=web"
        print(f"Visiting {url}")
        page.goto(url)
        time.sleep(3)
        
        print(f"Title: {page.title()}")
        
        # Dump some HTML
        with open("ddg_dump.html", "w") as f:
            f.write(page.content())
            
        print("Dumped ddg_dump.html")
        browser.close()

if __name__ == "__main__":
    debug_ddg()

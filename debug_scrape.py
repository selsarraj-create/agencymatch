from playwright.sync_api import sync_playwright
import time

URL = "https://models.com/agencies/United%20Kingdom/London"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    print(f"visiting {URL}")
    page.goto(URL, timeout=60000)
    time.sleep(5)
    content = page.content()
    with open("models_dump.html", "w") as f:
        f.write(content)
    print("Dumped HTML to models_dump.html")
    browser.close()

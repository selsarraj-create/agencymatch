import requests

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

URLS = [
    "https://models.com/agencies/United%20Kingdom/London",
    "https://www.productionparadise.com/spotlight/london-model-agencies.html",
    "https://www.businessmind.co.uk/modelling-agencies-london.html"
]

for url in URLS:
    try:
        print(f"Testing {url}...")
        resp = requests.get(url, headers=HEADERS, timeout=10)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            print(f"Length: {len(resp.text)}")
            print(resp.text[:2000])
    except Exception as e:
        print(f"Error: {e}")

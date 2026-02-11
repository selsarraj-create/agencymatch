
import json
import time
from playwright.sync_api import sync_playwright

targets = [
    {"name": "Present Model Management", "url": "https://www.presentmodelmanagement.com"},
    {"name": "Boundary London", "url": "https://www.boundary-london.com"},
    {"name": "11:14 Agency", "url": "https://www.1114agency.com"},
    {"name": "Muumaa", "url": "https://www.muumaa.com"},
    {"name": "JEM Models", "url": "https://www.wearejem.com"},
    {"name": "The Scouting Firm", "url": "https://www.scoutingfirm.com"},
    {"name": "Mint Casting", "url": "https://www.mintcasting.tv"},
    {"name": "NB Model Agency", "url": "https://www.nbmodelagency.com"},
    {"name": "Revolt Model Agency", "url": "https://www.revoltmodelagency.com"},
    {"name": "XDIRECTN", "url": "https://www.xdirectn.agency"},
    {"name": "Perspective Management", "url": "https://www.perspectivemanagement.co.uk"},
    {"name": "Supa Model Management", "url": "https://www.supamodelmanagement.com"},
    {"name": "Leni's Agency", "url": "https://www.lenisagency.com"},
    {"name": "AMCK Models", "url": "https://www.amckmodels.com"},
    {"name": "Kate Moss Agency", "url": "https://www.katemossagency.com"},
    {"name": "Next Management London", "url": "https://www.nextmanagement.com"},
    {"name": "Kids London", "url": "https://www.kidslondonltd.com"},
    {"name": "D1 Models", "url": "https://www.d1models.com"},
    {"name": "Mami Management", "url": "https://www.mamimanagement.com"},
    {"name": "The Hive Management", "url": "https://www.thehivemanagement.com"},
    {"name": "Brother Models", "url": "https://www.brothermodels.com"},
    {"name": "RMG Models", "url": "https://www.rmg-models.co.uk"},
    {"name": "Atlantis Modelling", "url": "https://www.atlantismodellingagency.co.uk"},
    {"name": "Evolve Model", "url": "https://www.evolvemodel.com"},
    {"name": "Flair Talent", "url": "https://www.flairtalent.com"}
]

results = []

def get_synopsis(page):
    try:
        desc = page.locator('meta[name="description"]').get_attribute("content")
        if desc: return desc
    except: pass
    
    try:
        og_desc = page.locator('meta[property="og:description"]').get_attribute("content")
        if og_desc: return og_desc
    except: pass
    
    return "A leading UK modeling agency."

def find_deep_link(page, base_url):
    candidates = []
    try:
        links = page.locator('a').all()
        for link in links:
            if not link.is_visible(): continue
            txt = link.inner_text().lower()
            href = link.get_attribute('href')
            if not href: continue
            
            # Absolute URL
            if href.startswith('/'):
                href = base_url.rstrip('/') + href
            elif not href.startswith('http'):
                continue
                
            score = 0
            if 'apply' in txt or 'become' in txt or 'join' in txt or 'scout' in txt:
                score += 5
            if 'application' in href or 'apply' in href or 'casting' in href:
                score += 5
            
            if score > 0:
                candidates.append((score, href))
    except: pass
    
    candidates.sort(key=lambda x: x[0], reverse=True)
    if candidates:
        return candidates[0][1]
    return base_url

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    print(f"Scraping {len(targets)} agencies...")
    
    for t in targets:
        url = t["url"]
        name = t["name"]
        print(f"Processing {name}...")
        
        try:
            page.goto(url, timeout=15000, wait_until="domcontentloaded")
            time.sleep(1)
            
            synopsis = get_synopsis(page)
            app_url = find_deep_link(page, url)
            
            # Special Overrides if detection fails
            if "scoutingfirm" in url and app_url == url:
                app_url = url # IT's a one-page site often
            if "mintcasting" in url:
                app_url = "https://www.mintcasting.tv/apply" 
            
            results.append({
                "name": name,
                "website": url,
                "application_url": app_url,
                "synopsis": synopsis
            })
            print(f"  -> Found: {app_url}")
            
        except Exception as e:
            print(f"  -> Failed: {e}")
            results.append({
                "name": name,
                "website": url,
                "application_url": url,
                "synopsis": "UK based modeling agency."
            })
            
    browser.close()

print("\n--- JSON OUTPUT ---")
print(json.dumps(results, indent=2))

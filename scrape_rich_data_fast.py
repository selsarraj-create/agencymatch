
import json
import time
from playwright.sync_api import sync_playwright

targets = [
    {"name": "Present Model Management", "alt_url": "https://www.presentmodelmanagement.com"},
    {"name": "Boundary London", "alt_url": "https://www.boundary-london.com"},
    {"name": "11:14 Agency", "alt_url": "https://www.1114agency.com"},
    {"name": "Muumaa", "alt_url": "https://www.muumaa.com"},
    {"name": "JEM Models", "alt_url": "https://www.wearejem.com"},
    {"name": "The Scouting Firm", "alt_url": "https://www.scoutingfirm.com"},
    {"name": "Mint Casting", "alt_url": "https://www.mintcasting.tv"},
    {"name": "NB Model Agency", "alt_url": "https://www.nbmodelagency.com"},
    {"name": "Revolt Model Agency", "alt_url": "https://www.revoltmodelagency.com"},
    {"name": "XDIRECTN", "alt_url": "https://www.xdirectn.agency"},
    {"name": "Perspective Management", "alt_url": "https://www.perspectivemanagement.co.uk"},
    {"name": "Supa Model Management", "alt_url": "https://www.supamodelmanagement.com"},
    {"name": "Leni's Agency", "alt_url": "https://www.lenisagency.com"},
    {"name": "AMCK Models", "alt_url": "https://www.amckmodels.com"},
    {"name": "Kate Moss Agency", "alt_url": "https://www.katemossagency.com"},
    {"name": "Next Management London", "alt_url": "https://www.nextmanagement.com"},
    {"name": "Kids London", "alt_url": "https://www.kidslondonltd.com"},
    {"name": "D1 Models", "alt_url": "https://www.d1models.com"},
    {"name": "Mami Management", "alt_url": "https://www.mamimanagement.com"},
    {"name": "The Hive Management", "alt_url": "https://www.thehivemanagement.com"},
    {"name": "Brother Models", "alt_url": "https://www.brothermodels.com"},
    {"name": "RMG Models", "alt_url": "https://www.rmg-models.co.uk"},
    {"name": "Atlantis Modelling", "alt_url": "https://www.atlantismodellingagency.co.uk"},
    {"name": "Evolve Model", "alt_url": "https://www.evolvemodel.com"},
    {"name": "Flair Talent", "alt_url": "https://www.flairtalent.com"}
]

results = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    # Reduced timeout to 5 seconds per page to fail fast
    page = browser.new_page(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    page.set_default_timeout(8000)
    
    print(f"Scraping {len(targets)} agencies (FAST MODE)...")
    
    for t in targets:
        url = t["alt_url"]
        name = t["name"]
        
        try:
            print(f"Visiting {name}...")
            response = page.goto(url, wait_until="domcontentloaded")
            
            # 1. Synopsis
            synopsis = "A UK-based modeling agency."
            try:
                desc = page.locator('meta[name="description"]').get_attribute("content")
                if desc and len(desc) > 10: synopsis = desc
            except: pass

            # 2. Application Link
            app_url = url
            try:
                # Get all links at once
                links = page.evaluate("""() => {
                    return Array.from(document.querySelectorAll('a')).map(a => ({
                        text: a.innerText.toLowerCase(),
                        href: a.href.toLowerCase(),
                        real_href: a.href
                    }));
                }""")
                
                best_score = 0
                
                for link in links:
                    txt = link['text']
                    href = link['href']
                    real = link['real_href']
                    
                    if not real: continue
                    
                    score = 0
                    if 'apply' in txt or 'become' in txt or 'scout' in txt or 'join' in txt: score += 10
                    if 'application' in href or 'apply' in href or 'scout' in href: score += 5
                    if 'contact' in href and score == 0: score = 1 # Fallback
                    
                    if score > best_score:
                        best_score = score
                        app_url = real
            except: pass
            
            results.append({
                "name": name,
                "website": url,
                "application_url": app_url,
                "synopsis": synopsis
            })
            
        except Exception as e:
            print(f"Skipping {name}: {e}")
            results.append({
                "name": name,
                "website": url,
                "application_url": url,
                "synopsis": "UK agency."
            })
            
    browser.close()

print(json.dumps(results, indent=2))

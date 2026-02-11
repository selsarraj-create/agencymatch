
import json
import time
from playwright.sync_api import sync_playwright

agencies = [
    "https://www.thehivemanagement.com",
    "https://www.presentmodelmanagement.com",
    "https://www.boundary-london.com",
    "https://www.brothermodels.com",
    "https://www.rmg-models.co.uk",
    "https://www.atlantismodellingagency.co.uk",
    "https://www.evolvemodel.com",
    "https://www.flairtalent.com",
    "https://www.bigmustard.co.uk",
    "https://www.modelmode.co.uk",
    "https://www.vauhaus.co.uk",
    "https://www.modelsdirect.com",
    "https://www.maverickmodels.co.uk",
    "https://www.coloursagency.com",
    "https://www.modelteam.co.uk",
    "https://www.alltalentagency.co.uk",
    "https://www.tartanmodels.co.uk",
    "https://www.d1models.com",
    "https://www.oxygenmodels.com",
    "https://www.establishedmodels.com",
    "https://www.duomodelmgmt.com",
    "https://www.bridgeagency.com",
    "https://www.1114agency.com",
    "https://www.perceptionmodels.com",
    "https://www.muumaa.com",
    "https://www.anonmodels.com",
    "https://www.thecrowdmodels.com",
    "https://www.wefolk.com",
    "https://www.littleallstars.co.uk",
    "https://www.realpeople.co.uk",
    "https://www.onemanagement.com",
    "https://www.3mmodels.com",
    "https://www.mamimanagement.com",
    "https://www.storymodelmanagement.com",
    "https://www.namedmodels.com",
    "https://www.titaniummanagement.com",
    "https://www.wearejem.com",
    "https://www.scoutingfirm.com",
    "https://www.mintcasting.tv",
    "https://www.nbmodelagency.com",
    "https://www.revoltmodelagency.com",
    "https://www.xdirectn.agency",
    "https://www.swaymodels.com",
    "https://www.perspectivemanagement.co.uk",
    "https://www.supamodelmanagement.com",
    "https://www.lenisagency.com",
    "https://www.amckmodels.com",
    "https://www.katemossagency.com",
    "https://www.nextmanagement.com",
    "https://www.kidslondonltd.com"
]

results = []

def find_apply_link(page, url):
    try:
        # Default to homepage
        best_link = url
        
        try:
            page.goto(url, timeout=10000, wait_until="domcontentloaded")
        except:
            return url 

        # 1. Search for keywords in <a> tags
        try:
            links = page.locator('a').all()
            found_candidate = False
            
            # Priority Keywords
            priorities = [
                ['become a model', 'be a model', 'join us', 'scouting', 'new faces', 'application'], # Tier 1
                ['apply', 'join', 'scout', 'representation'],    # Tier 2
                ['contact', 'about']                             # Tier 3 (Fallback)
            ]
            
            for tier in priorities:
                for link in links:
                    if not link.is_visible(): continue
                    txt = link.inner_text().lower()
                    href = link.get_attribute('href')
                    if not href: continue
                    
                    # Clean href
                    if href.startswith('/'):
                        href = url.rstrip('/') + href
                    
                    if any(kw in txt for kw in tier):
                        return href
                    
                    # Also check URL string itself
                    href_lower = href.lower()
                    if any(kw in href_lower for kw in tier):
                         # If it's a "contact" link, save it but keep looking for a better "apply" link
                         if 'contact' in href_lower or 'about' in href_lower:
                             best_link = href
                         else:
                             return href
        except:
            pass

        return best_link
    except:
        return url

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    print(f"Scanning {len(agencies)} agencies...")
    
    for url in agencies:
        app_url = find_apply_link(page, url)
        print(f"Found: {url} -> {app_url}")
        results.append({"name": "", "website": url, "application_url": app_url})
        
    browser.close()

print("\n--- JSON OUTPUT ---")
print(json.dumps(results, indent=2))

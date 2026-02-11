
import os
import time
import json
import random
from playwright.sync_api import sync_playwright

# List from search + existing seeds
AGENCY_SEEDS = [
    # Top Tier / Famous
    "https://www.stormmanagement.com",
    "https://www.elitemodel.co.uk",
    "https://www.models1.co.uk",
    "https://www.premiermodelmanagement.com",
    "https://www.selectmodel.com/london",
    "https://www.imgmodels.com",
    "https://www.wilhelmina.com/london",
    "https://www.tessmanagement.com",
    "https://www.milkmanagement.co.uk",
    "https://www.viva-paris.com/london",
    
    # Commercial / Boutique / New Finds
    "https://www.immmodels.com",
    "https://www.motmodel.com",
    "https://www.zone-models.com",
    "https://www.visionmodels.co.uk",
    "https://www.basemodels.co.uk",
    "https://www.prm-agency.com",
    "https://www.nevsmodels.co.uk",
    "https://www.thesquadmanagement.com",
    "https://www.crumbagency.com",
    "https://www.antiagency.co.uk",
    "https://www.firstmodelmanagement.co.uk",
    "https://www.lindenstaub.com",
    "https://www.wmodel.co.uk",
    "https://www.bmamodels.com",
    "https://www.sandrareynolds.co.uk",
    "https://www.bodylondon.com",
    "https://www.fortemodelmanagement.com",
    "https://www.gingersnap.co.uk",
    "https://www.bamemodels.com",
    "https://www.zebedeetalent.com",
    "https://www.ugly.org",
    "https://www.contactmodels.co.uk",
    "https://www.bossmodelmanagement.co.uk",
    "https://www.industrymodels.co.uk",
    "https://www.jadoremodels.co.uk",
    "https://www.nemesismodels.com",
    "https://www.savagemanagement.co.uk",
    "https://www.immagencygroup.com",
    "https://www.profile-models.com",
    "https://www.hastings-management.co.uk",
    "https://www.oxfordmodels.co.uk"
]

def scrape_agency_details(page, agency_url):
    """Visits the agency website and extracts details with improved heuristic."""
    try:
        print(f"   Exploring {agency_url}...")
        try:
            page.goto(agency_url, timeout=15000, wait_until="domcontentloaded")
        except:
             print(f"   Timeout exploring {agency_url}")
             return None
             
        time.sleep(1) # Allow JS to execute

        # 1. Title
        title = page.title()
        title = title.replace("Home", "").replace("Welcome", "").replace("|", "").strip()
        if len(title) > 50: title = title[:50]
        if not title: title = "Agency"

        # 2. Description
        description = None
        try:
            description = page.locator('meta[name="description"]').get_attribute("content")
        except:
            pass
        
        if not description:
            try:
                paragraphs = page.locator('p').all_inner_texts()
                for p in paragraphs:
                    if len(p) > 50:
                        description = p.strip()
                        break
            except:
                pass
        
        if not description:
            description = "A leading modeling agency based in the UK representing top talent."
            
        if len(description) > 250:
            description = description[:247] + "..."

        # 3. Apply Link - SCORING SYSTEM
        apply_url = agency_url
        best_score = 0
        
        try:
            links = page.locator('a').all()
            for link in links:
                try:
                    href = link.get_attribute("href")
                    if not href: continue
                    
                    # Normalize
                    href_lower = href.lower()
                    text = link.inner_text().lower()
                    
                    score = 0
                    
                    # High Priority Keywords in Text
                    if "become a model" in text: score += 10
                    elif "be a model" in text: score += 10
                    elif "apply" in text: score += 8
                    elif "scout" in text: score += 8
                    elif "join" in text and "us" in text: score += 5
                    elif "new faces" in text: score += 5
                    
                    # Keywords in URL
                    if "apply" in href_lower: score += 5
                    if "become" in href_lower: score += 5
                    if "scout" in href_lower: score += 5
                    if "join" in href_lower: score += 3
                    if "new-faces" in href_lower or "newfaces" in href_lower: score += 3
                    
                    # Penalties
                    if "news" in href_lower: score -= 10
                    if "login" in href_lower: score -= 10
                    if "contact" in href_lower: score -= 5 
                    if "javascript" in href_lower: score -= 20
                    if "mailto:" in href_lower: score -= 5
                    
                    if any(x in href_lower for x in ['/women/', '/men/', '/mainboard/', '/talent/']):
                        score -= 5 

                    # Must have at least some relevance
                    if score > best_score:
                        best_score = score
                        if href.startswith('http'):
                            apply_url = href
                        elif href.startswith('/'):
                            apply_url = agency_url.rstrip('/') + href
                except:
                    continue
        except:
            pass

        # 4. Image/Logo
        image_url = None
        try:
            image_url = page.locator('meta[property="og:image"]').get_attribute("content")
        except:
            pass

        if not image_url:
             try:
                # Extract domain
                domain = agency_url.split("//")[-1].split("/")[0].replace("www.", "")
                image_url = f"https://logo.clearbit.com/{domain}"
             except:
                pass

        if apply_url == agency_url or apply_url == (agency_url + "/"):
            # Fallback: Try common paths
            COMMON_PATHS = [
                "/apply", "/application", "/become-a-model", "/be-a-model", 
                "/scouting", "/new-faces", "/join", "/representation", 
                "/contact", "/about/contact"
            ]
            
            for path in COMMON_PATHS:
                candidate = agency_url.rstrip("/") + path
                try:
                    response = page.goto(candidate, timeout=5000, wait_until="domcontentloaded")
                    if response and response.ok:
                        page_title = page.title().lower()
                        if "404" not in page_title and "not found" not in page_title:
                            if len(page.content()) > 500:
                                apply_url = candidate
                                break
                except:
                    continue


        return {
            "name": title,
            "website_url": agency_url,
            "application_url": apply_url,
            "description": description,
            "image_url": image_url,
            "location": "London, UK", # Hardcoded per requester, mostly correct
            "status": "active"
        }

    except Exception as e:
        print(f"   Failed to scrape {agency_url}: {e}")
        return None

def main():
    print("🚀 Starting Agency Scraper for JSON Export...")
    
    agencies_list = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        for url in AGENCY_SEEDS:
            data = scrape_agency_details(page, url)
            if data:
                agencies_list.append(data)
                print(f"   ✅ Scraped: {data['name']}")
            
            time.sleep(0.5)

        browser.close()
    
    # Save to JSON
    with open("agencies_import.json", "w") as f:
        json.dump(agencies_list, f, indent=4)

    print(f"\n✨ Mission Complete! Saved {len(agencies_list)} agencies to agencies_import.json")

if __name__ == "__main__":
    main()

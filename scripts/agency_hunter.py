import os
import time
import random
from playwright.sync_api import sync_playwright
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# --- Configuration ---
SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials.")

# Initialize Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Hardcoded list of Top UK Agencies to guarantee data
AGENCY_SEEDS = [
    "https://www.stormmanagement.com",
    "https://www.elitemodel.co.uk",
    "https://www.models1.co.uk",
    "https://www.premiermodelmanagement.com",
    "https://www.selectmodel.com/london",
    "https://www.nevsmodels.co.uk",
    "https://www.thesquadmanagement.com",
    "https://www.viva-paris.com/london",
    "https://www.imgmodels.com",
    "https://www.wilhelmina.com/london",
    "https://www.tessmanagement.com",
    "https://www.milkmanagement.co.uk",
    "https://www.crumbagency.com",
    "https://www.antiagency.co.uk",
    "https://www.firstmodelmanagement.co.uk",
    "https://www.lindenstaub.com",
    "https://www.prm-agency.com",
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
    "https://www.zone-models.com",
    "https://www.base-models.com",
    "https://www.oxfordmodels.co.uk"
]

def clean_agencies_table():
    print("🧹 Cleaning existing agencies...")
    try:
        supabase.table("agencies").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    except Exception as e:
        print(f"Warning during cleanup: {e}")

def scrape_agency_details(page, agency_url):
    """Visits the agency website and extracts details with improved heuristic."""
    try:
        print(f"   Exploring {agency_url}...")
        try:
            page.goto(agency_url, timeout=20000, wait_until="domcontentloaded")
        except:
             print(f"   Timeout exploring {agency_url}")
             return None
             
        time.sleep(2) # Allow JS to execute

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
                    if "contact" in href_lower: score -= 5 # Contact is fallback, but Apply is better
                    if "javascript" in href_lower: score -= 20
                    if "mailto:" in href_lower: score -= 5
                    
                    # Filter model profiles (heuristic: url ends in number or name-like pattern inside a directory)
                    # e.g. /women/main/123-name
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
            
        # Fallback: specific check for "instagram" if no website apply link found? No, better stick to website.

        # 4. Image/Logo
        image_url = None
        logo_url = None
        try:
            image_url = page.locator('meta[property="og:image"]').get_attribute("content")
        except:
            pass

        # Try to find a logo
        try:
            # Common logo selectors
            logo_selectors = [
                'header img', '.logo img', '#logo img', 
                'img[alt*="logo" i]', 'a[href="/"] img',
                'img[src*="logo" i]', '.site-logo img'
            ]
            for selector in logo_selectors:
                elements = page.locator(selector).all()
                for el in elements:
                    if not el.is_visible(): continue
                    
                    src = el.get_attribute("src")
                    if src:
                        # Skip if it's a tiny icon or tracking pixel
                        rect = el.bounding_box()
                        if rect and (rect['width'] < 20 or rect['height'] < 20): continue
                        
                        if src.startswith("http"):
                            logo_url = src
                        elif src.startswith("/"):
                            logo_url = agency_url.rstrip("/") + src
                        else:
                             logo_url = agency_url.rstrip("/") + "/" + src
                        break
                if logo_url: break
        except:
            pass
            
        # Fallback: Use Clearbit Logo API (Very reliable for main domains)
        if not logo_url:
            try:
                # Extract domain
                domain = agency_url.split("//")[-1].split("/")[0].replace("www.", "")
                logo_url = f"https://logo.clearbit.com/{domain}"
            except:
                pass

        # Fallback: if no logo, use OG image
        if not logo_url and image_url:
            logo_url = image_url
            
        # Use OG image as fallback for logo if it looks square-ish or small? 
        # Actually better to keep them separate. If no logo found, frontend can use name initials.

        # 5. Modeling Types Heuristic
        modeling_types = []
        try:
            page_text = page.content().lower()
            
            keywords = {
                "High Fashion": ["high fashion", "editorial", "runway", "vogue", "campaigns"],
                "Commercial": ["commercial", "advertising", "lifestyle", "catalogue", "e-commerce"],
                "Classic / Mature": ["classic", "mature", "over 40", "legends"],
                "Influencer": ["influencer", "talent", "content creator", "digital"],
                "Real People": ["real people", "street casting", "character"],
                "Curve / Plus": ["curve", "plus size", "plus-size"],
                "Men": ["men", "male models"],
                "Women": ["women", "female models"],
                "Non-Binary": ["non-binary", "fluid"]
            }
            
            for type_name, tags in keywords.items():
                if any(tag in page_text for tag in tags):
                    modeling_types.append(type_name)
                    
            if not modeling_types:
                modeling_types = ["Fashion", "Commercial"] # Default fallback
                
        except:
            modeling_types = ["Fashion"]

        if apply_url == agency_url or apply_url == (agency_url + "/"):
            # Fallback: Try common paths
            print(f"   ⚠️  No direct apply link found on page. Trying common paths...")
            COMMON_PATHS = [
                "/apply", "/application", "/become-a-model", "/be-a-model", 
                "/scouting", "/new-faces", "/join", "/representation", 
                "/contact", "/about/contact"
            ]
            
            for path in COMMON_PATHS:
                candidate = agency_url.rstrip("/") + path
                try:
                    print(f"      Checking {candidate}...")
                    response = page.goto(candidate, timeout=8000, wait_until="domcontentloaded")
                    
                    # Check if valid
                    if response and response.ok:
                        # Check title for 404
                        page_title = page.title().lower()
                        if "404" not in page_title and "not found" not in page_title and "error" not in page_title:
                            # Verify it has some content
                            if len(page.content()) > 1000:
                                print(f"      Found valid page: {candidate}")
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
            "logo_url": logo_url,
            "modeling_types": modeling_types,
            "location": "UK",
            "status": "active"
        }

    except Exception as e:
        print(f"   Failed to scrape {agency_url}: {e}")
        return None

def main():
    print("🚀 Starting Agency Hunter (Seed List Mode)...")
    clean_agencies_table()
    
    agencies_added = 0
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        for url in AGENCY_SEEDS:
            data = scrape_agency_details(page, url)
            if data:
                try:
                    supabase.table("agencies").insert(data).execute()
                    print(f"   ✅ Saved: {data['name']}")
                    agencies_added += 1
                except Exception as e:
                    print(f"   ❌ DB Insert Failed: {e}")
            
            time.sleep(1)

        browser.close()

    print(f"\n✨ Mission Complete! Added {agencies_added} agencies.")

if __name__ == "__main__":
    main()

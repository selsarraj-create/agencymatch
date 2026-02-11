
import os
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase
url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Supabase credentials not found.")
    exit(1)

supabase: Client = create_client(url, key)

def get_best_logo(website_url):
    if not website_url:
        return None
    
    if not website_url.startswith("http"):
        website_url = "https://" + website_url

    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(website_url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 1. Try Open Graph Image (often best for cards)
            og_image = soup.find("meta", property="og:image")
            if og_image and og_image.get("content"):
                return urljoin(website_url, og_image["content"])
            
            # 2. Try Apple Touch Icon (high res icon)
            apple_icon = soup.find("link", rel="apple-touch-icon")
            if apple_icon and apple_icon.get("href"):
                return urljoin(website_url, apple_icon["href"])
                
            # 3. Try generic icon
            icon = soup.find("link", rel="icon")
            if icon and icon.get("href"):
                 return urljoin(website_url, icon["href"])

    except Exception as e:
        print(f"  - Failed to scrape {website_url}: {e}")

    # 4. Fallback: Google Favicon API (Reliable, consistent size)
    # Using size=128 to get a decent quality
    domain = urlparse(website_url).netloc
    return f"https://www.google.com/s2/favicons?domain={domain}&sz=128"

def main():
    print("Fetching agencies...")
    # Fetch all agencies
    # You might want to filter for those with generic images if you can identify them, 
    # or just run for all. Let's run for all for now or those with 'placehold.co'
    response = supabase.table('agencies').select("id, name, website_url, image_url").execute()
    agencies = response.data
    
    print(f"Found {len(agencies)} agencies.")
    
    for agency in agencies:
        # Check if needs update (e.g. is null or placeholder)
        current_img = agency.get('image_url') or ""
        
        # Determine if we should update
        # Update if None, empty, or placeholder
        if not current_img or "placehold.co" in current_img or "placeholder" in current_img:
            print(f"Processing {agency['name']} ({agency['website_url']})...")
            
            new_logo = get_best_logo(agency['website_url'])
            
            if new_logo:
                print(f"  - Found logo: {new_logo}")
                # Update DB
                supabase.table('agencies').update({"image_url": new_logo}).eq("id", agency['id']).execute()
            else:
                print("  - No logo found.")
            
            # Be nice to rate limits
            time.sleep(1)
        else:
            print(f"Skipping {agency['name']} (Already has image: {current_img[:30]}...)")

if __name__ == "__main__":
    main()


import json
import re

def normalize_url(url):
    if not url: return ""
    return url.lower().rstrip('/').replace('www.', '').split('//')[-1].split('/')[0]

def main():
    print("🚀 Merging agency lists...")
    
    # Load Master
    try:
        with open('uk_agencies_master.json', 'r') as f:
            master = json.load(f)
    except FileNotFoundError:
        master = []
    
    print(f"📖 Loaded {len(master)} existing agencies.")

    # Load Provided
    try:
        with open('provided_agencies.json', 'r') as f:
            provided = json.load(f)
    except FileNotFoundError:
        print("❌ provided_agencies.json not found!")
        return
        
    print(f"📖 Loaded {len(provided)} new agencies from user input.")

    # Map mapping
    # normalized_domain -> agency_object
    agency_map = {}
    
    # 1. Add Master to Map
    for agency in master:
        domain = normalize_url(agency.get('website_url', ''))
        if not domain and agency.get('application_url'):
             domain = normalize_url(agency.get('application_url', ''))
        
        if domain:
            agency_map[domain] = agency

    # 2. Process Provided
    new_count = 0
    updated_count = 0
    
    for item in provided:
        # Extract fields
        name = item.get('agency')
        app_url = item.get('url')
        category = item.get('category', 'Fashion & Commercial')
        
        # Infer website_url from app_url if possible
        website_url = ""
        if app_url:
            if "mailto:" in app_url:
                # format: mailto:info@domain.com
                parts = app_url.split('@')
                if len(parts) > 1:
                    website_url = "https://www." + parts[1]
            else:
                # format: https://domain.com/apply
                from urllib.parse import urlparse
                parsed = urlparse(app_url)
                if parsed.scheme and parsed.netloc:
                    website_url = f"{parsed.scheme}://{parsed.netloc}"
        
        domain = normalize_url(website_url)
        if not domain and app_url and "mailto:" not in app_url:
             domain = normalize_url(app_url)

        # Build Clean Object
        new_obj = {
            "name": name,
            "website_url": website_url or app_url, # Fallback
            "application_url": app_url,
            "type": category,
            "synopsis": f"{category} agency based in the UK.",
            "location": "UK",
            "status": "active"
        }

        if domain in agency_map:
            # Update existing if needed? 
            # The provided list seems high quality with specific categories. 
            # Let's overwrite type/synopsis if generic, or just keep master?
            # actually, let's keep master mostly, but maybe update application_url if missing?
            existing = agency_map[domain]
            if not existing.get('application_url') or existing.get('application_url') == existing.get('website_url'):
                 existing['application_url'] = app_url
                 updated_count += 1
            # Merge category if different?
            if existing.get('type') != category:
                 existing['type'] = category # User provided seems better
        else:
            if domain:
                agency_map[domain] = new_obj
                new_count += 1
            else:
                # No domain found (maybe just email?), add anyway using name as key? No, risky. 
                # If mailto, we generated a domain. 
                # Let's just add it.
                agency_map[f"MANUAL_{name}"] = new_obj
                new_count += 1

    # Convert back to list
    final_list = list(agency_map.values())
    
    print(f"✨ Merged! {new_count} new agencies added. {updated_count} updated.")
    print(f"📦 Total agencies: {len(final_list)}")

    # Save
    with open('uk_agencies_master_expanded.json', 'w') as f:
        json.dump(final_list, f, indent=4)
        
    print("✅ Saved to uk_agencies_master_expanded.json")

if __name__ == "__main__":
    main()

import json

def categorize_email_agencies():
    print("🕵️‍♀️ Categorizing Email-Only Agencies...")
    
    file_path = 'uk_agencies_master.json'
    
    try:
        with open(file_path, 'r') as f:
            agencies = json.load(f)
    except FileNotFoundError:
        print("❌ uk_agencies_master.json not found.")
        return

    email_count = 0
    
    for agency in agencies:
        app_url = agency.get('application_url', '').lower()
        
        # Check if the application URL is a mailto link
        if app_url.startswith('mailto:'):
            # Preserve original type in synopsis if not already present
            current_type = agency.get('type', 'Unknown')
            current_synopsis = agency.get('synopsis', '')
            
            if f"[{current_type}]" not in current_synopsis:
                 agency['synopsis'] = f"[{current_type}] {current_synopsis}"
            
            # Update the type to a specific category
            agency['type'] = "Email Application 📧" 
            email_count += 1

    print(f"✅ Updated {email_count} agencies to 'Email Application' category.")
    
    with open(file_path, 'w') as f:
        json.dump(agencies, f, indent=4)
        
    print(f"💾 Saved updates to {file_path}")

if __name__ == "__main__":
    categorize_email_agencies()

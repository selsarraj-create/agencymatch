
import json

def main():
    print("🧹 Removing Email-Only Agencies...")
    
    FILE_PATH = 'uk_agencies_master.json'
    
    try:
        with open(FILE_PATH, 'r') as f:
            agencies = json.load(f)
    except FileNotFoundError:
        print("❌ uk_agencies_master.json not found.")
        return

    original_count = len(agencies)
    # Filter out agencies with mailto: links or the specific category we just made
    filtered_agencies = [
        a for a in agencies 
        if not a.get('application_url', '').lower().startswith('mailto:')
        and "Email Application" not in a.get('type', '')
    ]
    
    removed_count = original_count - len(filtered_agencies)

    print(f"✅ Removed {removed_count} agencies with email-only applications.")
    print(f"📦 New total: {len(filtered_agencies)}")
    
    with open(FILE_PATH, 'w') as f:
        json.dump(filtered_agencies, f, indent=4)
        
    print(f"💾 Saved filtered list to {FILE_PATH}")

if __name__ == "__main__":
    main()

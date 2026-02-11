
import json
import csv
import os

def main():
    print("📊 Exporting agencies to CSV...")
    
    JSON_PATH = 'uk_agencies_master.json'
    CSV_PATH = 'uk_active_agencies.csv'
    
    try:
        with open(JSON_PATH, 'r') as f:
            agencies = json.load(f)
    except FileNotFoundError:
        print("❌ uk_agencies_master.json not found.")
        return

    if not agencies:
        print("⚠️ No agencies found to export.")
        return

    # Define CSV headers
    headers = [
        "Name", 
        "Website URL", 
        "Application URL", 
        "Category", 
        "Status", 
        "Location", 
        "Synopsis"
    ]

    with open(CSV_PATH, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        
        count = 0
        for agency in agencies:
            writer.writerow([
                agency.get('name', ''),
                agency.get('website_url', ''),
                agency.get('application_url', ''),
                agency.get('type', ''),
                agency.get('status', 'active'),
                agency.get('location', 'UK'),
                agency.get('synopsis', '')
            ])
            count += 1
            
    print(f"✅ Successfully exported {count} agencies to {os.path.abspath(CSV_PATH)}")

if __name__ == "__main__":
    main()

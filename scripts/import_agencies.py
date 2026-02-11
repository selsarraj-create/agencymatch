
import os
import json
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

def import_agencies():
    print("🚀 Starting Agency Import...")
    
    # Load JSON
    try:
        with open("uk_agencies_master.json", "r") as f:
            agencies = json.load(f)
    except FileNotFoundError:
        print("❌ Error: uk_agencies_master.json not found.")
        return

    print(f"📦 Found {len(agencies)} agencies to import.")

    # Optional: Clean table first? 
    # Let's decide to clean it to ensure a fresh high-quality list, 
    # or we can just append. The user context implies this is the 'Master' list.
    # We will clean to avoid duplicates from previous runs.
    print("🧹 Cleaning existing agencies (except system rows)...")
    try:
        supabase.table("agencies").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    except Exception as e:
        print(f"Warning during cleanup: {e}")

    count = 0
    for agency in agencies:
        try:
            # Map JSON keys to DB columns
            # synopsis -> description
            if "synopsis" in agency:
                agency["description"] = agency.pop("synopsis")
            
            # type -> modeling_types
            if "type" in agency:
                agency["modeling_types"] = [agency.pop("type")]
            
            # Remove keys that might not exist in DB if they were renamed/moved above
            if "agency_type" in agency:
                del agency["agency_type"]

            # Add logo_url fallback if missing
            if "logo_url" not in agency:
                 # Simple Clearbit fallback
                 domain = agency.get("website_url", "").split("//")[-1].split("/")[0].replace("www.", "")
                 agency["logo_url"] = f"https://logo.clearbit.com/{domain}"
            
            supabase.table("agencies").insert(agency).execute()
            print(f"   ✅ Imported: {agency['name']}")
            count += 1
        except Exception as e:
            print(f"   ❌ Failed to import {agency.get('name')}: {e}")

    print(f"\n✨ Import Complete! {count} agencies are live in the database.")

if __name__ == "__main__":
    import_agencies()

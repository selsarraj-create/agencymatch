import os
from supabase import create_client, Client
import json
import datetime
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase Client
# Initialize Supabase Client
# Initialize Supabase Client
url: str = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
key: str = (os.environ.get("SUPABASE_SERVICE_KEY") or 
            os.environ.get("SUPABASE_KEY") or 
            os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY") or 
            os.environ.get("VITE_SUPABASE_ANON_KEY"))

if not url:
    print("CRITICAL ERROR: Supabase URL not found in env vars (checked SUPABASE_URL, VITE_SUPABASE_URL)")
if not key:
    print("CRITICAL ERROR: Supabase Key not found in env vars (checked SUPABASE_SERVICE_KEY, SUPABASE_KEY, VITE_SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_ANON_KEY)")

if not url or not key:
    print("WARNING: Database not initialized due to missing config.")
    supabase = None
else:
    try:
        print(f"Initializing Supabase with URL: {url} and Key length: {len(key)}")
        supabase: Client = create_client(url, key)
        print("Supabase client initialized successfully.")
    except Exception as e:
        print(f"Failed to initialize Supabase client: {e}")
        supabase = None

def init_db():
    # Supabase is managed externally, no need to create tables here usually.
    # But we can check connection.
    if not supabase:
        print("Supabase client not initialized.")
        return
    print("Supabase client initialized.")

def save_lead(lead):
    if not supabase:
        print("Error: Supabase not configured. Cannot save lead.")
        return None

    # Extract score and category from analysis_data if present, else default
    score = lead.analysis_data.get('suitability_score', 0)
    # Handle nested market_categorization
    market_data = lead.analysis_data.get('market_categorization', {})
    if isinstance(market_data, dict):
        category = market_data.get('primary', 'Unknown')
    else:
        category = str(market_data)

    data = {
        "first_name": lead.first_name,
        "last_name": lead.last_name,
        "age": lead.age,
        "gender": lead.gender,
        "email": lead.email,
        "phone": lead.phone,
        "city": lead.city,
        "zip_code": lead.zip_code,
        "wants_assessment": lead.wants_assessment,
        "score": score,
        "category": category,
        "analysis_json": json.dumps(lead.analysis_data),
        # timestamp is usually handled by db default, but can be added if needed
    }

    try:
        response = supabase.table("leads").insert(data).execute()
        # Supabase returns data in response.data which is a list of dicts
        if response.data and len(response.data) > 0:
            return response.data[0].get('id')
        return None
    except Exception as e:
        print(f"Error saving to Supabase: {e}")
        # Build robustness: if table doesn't exist, we might want to log it specifically
        return None

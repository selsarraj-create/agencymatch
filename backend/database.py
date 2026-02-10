import os
from supabase import create_client, Client
import json
import datetime
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase Client
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("WARNING: SUPABASE_URL or SUPABASE_KEY not found in environment.")
    supabase = None
else:
    supabase: Client = create_client(url, key)

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

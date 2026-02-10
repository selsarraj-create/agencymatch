from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("No keys found")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    print("Fetching agency application URLs...")
    response = supabase.table("agencies").select("name, application_url, website_url").limit(10).execute()
    for row in response.data:
        print(f"Name: {row['name']}")
        print(f"  Web: {row['website_url']}")
        print(f"  App: {row['application_url']}")
        print("-" * 20)
except Exception as e:
    print("Failed:", e)

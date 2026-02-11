
import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(url, key)

print("Checking 'profiles' table columns...")

try:
    # Try to select generated_photos from a random profile (limit 1)
    # If column doesn't exist, this should error
    res = supabase.table('profiles').select('generated_photos').limit(1).execute()
    print(f"✅ Select 'generated_photos' successful: {res.data}")
except Exception as e:
    print(f"❌ Failed to select 'generated_photos': {e}")
    print("Likely cause: Column does not exist.")


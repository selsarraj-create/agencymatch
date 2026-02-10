
import os
from supabase import create_client, Client
from dotenv import load_dotenv
import os

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
print(f"Loading .env from: {env_path}")
load_dotenv(env_path)

url = os.environ.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
key = os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Error: SUPABASE_URL or SUPABASE_SERVICE_KEY not found in environment.")
    exit(1)

supabase: Client = create_client(url, key)

print("Checking for 'profiles' table...")
try:
    response = supabase.table("profiles").select("*").limit(1).execute()
    print("Success! profiles table exists.")
    print(response)
except Exception as e:
    print(f"Error accessing profiles: {e}")

print("\nChecking for 'users' table...")
try:
    response = supabase.table("users").select("*").limit(1).execute()
    print("Success! users table exists.")
except Exception as e:
    print(f"Error accessing users: {e}")

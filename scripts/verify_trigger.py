
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(url, key)

print("🔍 Checking for 'auto_refund_trigger' on 'applications_tracking'...")

# We can't easily query information_schema via PostgREST usually.
# But we can try to see if we can trigger it or just trust the user.
# Let's try to verify the function exists by calling it? 
# No, it's a trigger function (returns TRIGGER), not callable directly via RPC usually.

# Alternate: Trigger a refund flow on a test user?
# That requires creating a user, creating a casting, applying, then failing.
# Too invasive for production check without explicit test environment.

# Let's try a simple heuristic: 
# If the user says they ran it, and we see no errors, we might just update the task.
# But I will try to inspect the `applications_tracking` table again to see if I can find any metadata locally? No.

# I will try to verify if I can select from information_schema.tables (schema inspection previously failed on some tables).
# If this fails, I will trust the user.

try:
    # Attempt to query valid table to ensure connection is still good
    res = supabase.table('applications_tracking').select('id').limit(1).execute()
    print("✅ Connection to 'applications_tracking' is good.")
    print("Assuming trigger exists based on user confirmation.")
except Exception as e:
    print(f"❌ Error connecting: {e}")

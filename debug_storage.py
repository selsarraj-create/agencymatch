
import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY") # Use Service Role for backend ops

if not url or not key:
    print("❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)

supabase: Client = create_client(url, key)

print(f"Connecting to Supabase: {url}")

# 1. List Buckets
print("\n--- Listing Buckets ---")
try:
    buckets = supabase.storage.list_buckets()
    bucket_names = [b.name for b in buckets]
    print(f"Buckets found: {bucket_names}")
    
    if "generated" not in bucket_names:
        print("❌ 'generated' bucket NOT found!")
    else:
        print("✅ 'generated' bucket exists.")

    if "uploads" not in bucket_names:
        print("❌ 'uploads' bucket NOT found!")
    else:
        print("✅ 'uploads' bucket exists.")

except Exception as e:
    print(f"❌ Failed to list buckets: {e}")

# 2. Try Upload to 'generated'
print("\n--- Testing Upload to 'generated' ---")
try:
    test_filename = "debug_test_file.txt"
    res = supabase.storage.from_("generated").upload(
        test_filename,
        b"test content",
        {"content-type": "text/plain", "upsert": "true"}
    )
    print(f"✅ Upload successful: {res}")
    
    # 3. Get Public URL
    url = supabase.storage.from_("generated").get_public_url(test_filename)
    print(f"✅ Public URL: {url}")
    
except Exception as e:
    print(f"❌ Upload failed: {e}")


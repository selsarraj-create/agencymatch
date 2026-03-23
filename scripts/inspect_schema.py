
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("❌ Missing Supabase credentials in .env")
    exit(1)

supabase: Client = create_client(url, key)

def inspect_table(table_name):
    print(f"🔍 Inspecting table: {table_name}")
    try:
        # Try to select one row to see if table exists and get columns
        response = supabase.table(table_name).select("*").limit(1).execute()
        if response.data is not None:
            print(f"✅ Table '{table_name}' exists.")
            if len(response.data) > 0:
                print(f"   Columns: {list(response.data[0].keys())}")
            else:
                print("   Table is empty, cannot infer columns from data.")
                # If empty, we might not see columns easily via simple select unless we check error
        else:
             print(f"⚠️ Table '{table_name}' access returned no data (might be RLS or empty).")
    except Exception as e:
        print(f"❌ Error accessing '{table_name}': {e}")


def list_tables():
    inspect_table("profiles")

list_tables()


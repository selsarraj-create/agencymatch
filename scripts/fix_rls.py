
import psycopg2
import sys

# Connection string provided by user
DB_URL = "postgresql://postgres:3TDpGHC4JBpgIXi@db.qldeodupxwwxysfnpseq.supabase.co:5432/postgres"

SQL_FILE_PATH = r"C:\Users\selsa\.gemini\antigravity\brain\e23a96d3-837e-41eb-b4e3-96297b16dc43\fix_rls_recursion.sql"

def apply_fix():
    print("Connecting to Supabase Database...")
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cursor = conn.cursor()
        
        print(f"Reading SQL from {SQL_FILE_PATH}...")
        with open(SQL_FILE_PATH, 'r') as f:
            sql_fix = f.read()

        print("Executing RLS Policy Fix on PROFILES...")
        cursor.execute(sql_fix)
        
        print("✅ Success! RLS Policy applied to profiles table.")
        print("Users should now be able to insert/update their own profile data.")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"❌ Error applying fix: {e}")
        sys.exit(1)

if __name__ == "__main__":
    apply_fix()

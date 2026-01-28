
import psycopg2
import sys

# Connection string provided by user
DB_URL = "postgresql://postgres:3TDpGHC4JBpgIXi@db.qldeodupxwwxysfnpseq.supabase.co:5432/postgres"

SQL_FIX = """
-- 1. Enable RLS (idempotent)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- 2. Drop specific policy if exists to avoid conflict
DROP POLICY IF EXISTS "Allow anon users to insert leads" ON leads;

-- 3. Re-create the policy allowing anon inserts
CREATE POLICY "Allow anon users to insert leads"
    ON leads
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- 4. Grant permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON TABLE leads TO anon;
GRANT ALL ON TABLE leads TO service_role;
"""

def apply_fix():
    print("Connecting to Supabase Database...")
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("Executing RLS Policy Fix...")
        cursor.execute(SQL_FIX)
        
        print("✅ Success! RLS Policy applied.")
        print("Anonymous users should now be able to insert leads.")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"❌ Error applying fix: {e}")
        sys.exit(1)

if __name__ == "__main__":
    apply_fix()

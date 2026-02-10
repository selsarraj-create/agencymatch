-- Enable RLS
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Enable read access for all users" ON public.agencies
AS PERMISSIVE FOR SELECT
TO public
USING (true);

-- Allow all access to admins (assuming admin logic via metadata or check)
-- For now, enabling for authenticated users who are admins.
-- This requires the 'am_i_admin' function to be robust or simple check.
-- To simplify for this specific user request, we can create a policy:
-- "Allow full access to service_role" (default)
-- AND "Allow full access to authenticated users with admin claim"

-- NOTE: If you are using simple client-side RLS using supabase-js, 
-- we need a policy that allows INSERT/UPDATE/DELETE.

CREATE POLICY "Enable insert for admins" ON public.agencies
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true)
);

CREATE POLICY "Enable update for admins" ON public.agencies
FOR UPDATE TO authenticated
USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true)
)
WITH CHECK (
  auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true)
);

CREATE POLICY "Enable delete for admins" ON public.agencies
FOR DELETE TO authenticated
USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true)
);

-- Note: The user table check depends on your schema.
-- If you strictly rely on the backend for admin actions, RLS might not matter as much if using service key there.
-- But since frontend is doing it, we need RLS.

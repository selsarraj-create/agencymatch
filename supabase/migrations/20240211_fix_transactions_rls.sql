-- Fix RLS Policy for Transactions
-- Goal: Allow authenticated users to insert their own transaction records.

BEGIN;

-- Ensure RLS is enabled
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing likely conflicting policies to be safe
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;

-- 1. INSERT Policy
CREATE POLICY "Users can insert their own transactions"
ON public.transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 2. SELECT Policy (Read their own history)
CREATE POLICY "Users can view their own transactions"
ON public.transactions
FOR SELECT
USING (auth.uid() = user_id);

COMMIT;

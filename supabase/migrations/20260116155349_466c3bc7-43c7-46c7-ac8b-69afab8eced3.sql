
-- Remove the foreign key constraint on prescribers.user_id since we can't insert into auth.users
-- This allows demo data and also makes the schema more flexible
ALTER TABLE public.prescribers DROP CONSTRAINT IF EXISTS prescribers_user_id_fkey;

-- Also remove from profiles if it exists (for demo profiles)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

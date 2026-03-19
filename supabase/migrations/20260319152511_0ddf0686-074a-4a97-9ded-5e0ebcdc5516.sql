
-- Drop the existing INSERT policy and replace with one that forces verification_status = 'pending'
DROP POLICY IF EXISTS "Prescribers can insert their own record" ON public.prescribers;

CREATE POLICY "Prescribers can insert their own record"
ON public.prescribers
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id AND verification_status = 'pending');

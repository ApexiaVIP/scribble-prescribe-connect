DROP POLICY "Anyone can view active verified prescribers" ON public.prescribers;

CREATE POLICY "Anyone can view active verified prescribers"
ON public.prescribers
FOR SELECT
TO public
USING (is_active = true AND verification_status = 'approved');

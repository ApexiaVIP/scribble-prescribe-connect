DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view approved prescriber profile name"
ON public.profiles FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.prescribers pr
    WHERE pr.user_id = profiles.user_id
      AND pr.is_active = true
      AND pr.verification_status = 'approved'::verification_status
  )
);

DROP POLICY IF EXISTS "Users can insert their own role during signup" ON public.user_roles;
CREATE POLICY "Users can self-assign non-admin role during signup"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('prescriber'::app_role, 'business'::app_role)
);

DROP POLICY IF EXISTS "Anyone can view active verified prescribers" ON public.prescribers;
CREATE POLICY "Anyone can view active verified prescribers"
ON public.prescribers FOR SELECT
TO anon, authenticated
USING (is_active = true AND verification_status = 'approved'::verification_status);
-- Profiles: remove the policy that exposed full rows publicly
DROP POLICY IF EXISTS "Anyone can view approved prescriber profile name" ON public.profiles;

-- Public, column-limited view for prescriber display (name + avatar only)
CREATE OR REPLACE VIEW public.public_prescriber_profiles
WITH (security_invoker = off)
AS
SELECT pr.user_id, p.full_name, p.avatar_url
FROM public.prescribers pr
JOIN public.profiles p ON p.user_id = pr.user_id
WHERE pr.is_active = true
  AND pr.verification_status = 'approved'::verification_status;

REVOKE ALL ON public.public_prescriber_profiles FROM PUBLIC;
GRANT SELECT ON public.public_prescriber_profiles TO anon, authenticated;

-- Verification documents: restrict to owner only
DROP POLICY IF EXISTS "Anyone can check document status" ON public.verification_documents;

CREATE POLICY "Prescribers can view their own documents"
ON public.verification_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.prescribers pr
    WHERE pr.id = verification_documents.prescriber_id
      AND pr.user_id = auth.uid()
  )
);

-- Safe, public helper: returns whether a prescriber has an approved verification document
CREATE OR REPLACE FUNCTION public.prescriber_has_verified_document(_prescriber_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.verification_documents vd
    WHERE vd.prescriber_id = _prescriber_id
      AND vd.status = 'approved'
  );
$$;

REVOKE ALL ON FUNCTION public.prescriber_has_verified_document(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prescriber_has_verified_document(uuid) TO anon, authenticated;
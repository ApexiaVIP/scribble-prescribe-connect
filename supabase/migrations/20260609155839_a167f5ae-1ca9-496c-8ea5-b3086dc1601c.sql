DROP VIEW IF EXISTS public.public_prescriber_profiles;

CREATE OR REPLACE FUNCTION public.get_public_prescriber_profiles(_user_ids uuid[] DEFAULT NULL)
RETURNS TABLE(user_id uuid, full_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.user_id, p.full_name, p.avatar_url
  FROM public.prescribers pr
  JOIN public.profiles p ON p.user_id = pr.user_id
  WHERE pr.is_active = true
    AND pr.verification_status = 'approved'::verification_status
    AND (_user_ids IS NULL OR pr.user_id = ANY(_user_ids));
$$;

REVOKE ALL ON FUNCTION public.get_public_prescriber_profiles(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_prescriber_profiles(uuid[]) TO anon, authenticated;
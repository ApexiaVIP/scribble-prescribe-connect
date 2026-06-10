-- Remove blanket SELECT for anon, grant only non-sensitive columns
REVOKE SELECT ON public.prescribers FROM anon;

GRANT SELECT (
  id,
  user_id,
  prescriber_type,
  bio,
  years_experience,
  location,
  regions_covered,
  specialisations,
  sectors,
  availability_types,
  verification_status,
  is_active,
  created_at,
  updated_at
) ON public.prescribers TO anon;

-- authenticated retains full SELECT (granted by default in earlier setup); ensure it's explicit
GRANT SELECT ON public.prescribers TO authenticated;
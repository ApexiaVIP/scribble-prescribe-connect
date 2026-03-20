DROP POLICY "Users can view all profiles" ON public.profiles;

CREATE POLICY "Anyone can view profiles"
ON public.profiles
FOR SELECT
TO public
USING (true);

DROP POLICY "Prescribers can view their own documents" ON public.verification_documents;

CREATE POLICY "Anyone can check document status"
ON public.verification_documents
FOR SELECT
TO public
USING (true);

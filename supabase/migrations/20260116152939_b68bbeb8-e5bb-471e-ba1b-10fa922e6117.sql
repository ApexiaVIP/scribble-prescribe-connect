-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('prescriber', 'business', 'admin');

-- Create enum for prescriber types
CREATE TYPE public.prescriber_type AS ENUM ('gp', 'pharmacist', 'nurse_prescriber', 'dentist', 'other');

-- Create enum for availability types
CREATE TYPE public.availability_type AS ENUM ('hourly', 'daily', 'long_term');

-- Create enum for booking status
CREATE TYPE public.booking_status AS ENUM ('pending', 'accepted', 'declined', 'completed', 'cancelled');

-- Create enum for verification status
CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected');

-- Create user_roles table (security best practice - separate from profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create profiles table for basic user info
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prescribers table for prescriber-specific details
CREATE TABLE public.prescribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  prescriber_type prescriber_type NOT NULL,
  registration_number TEXT NOT NULL,
  bio TEXT,
  years_experience INTEGER,
  hourly_rate DECIMAL(10,2),
  daily_rate DECIMAL(10,2),
  location TEXT,
  regions_covered TEXT[],
  specialisations TEXT[],
  sectors TEXT[],
  availability_types availability_type[],
  verification_status verification_status NOT NULL DEFAULT 'pending',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create businesses table for business-specific details
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  business_type TEXT,
  description TEXT,
  location TEXT,
  address TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create verification_documents table for prescriber document uploads
CREATE TABLE public.verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescriber_id UUID REFERENCES public.prescribers(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  status verification_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Create availability table for prescriber availability slots
CREATE TABLE public.availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescriber_id UUID REFERENCES public.prescribers(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  availability_type availability_type NOT NULL,
  is_booked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescriber_id UUID REFERENCES public.prescribers(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  availability_id UUID REFERENCES public.availability(id) ON DELETE SET NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table for tracking transactions
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prescribers_updated_at
  BEFORE UPDATE ON public.prescribers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own role during signup"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for prescribers
CREATE POLICY "Anyone can view active verified prescribers"
  ON public.prescribers FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Prescribers can insert their own record"
  ON public.prescribers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Prescribers can update their own record"
  ON public.prescribers FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for businesses
CREATE POLICY "Authenticated users can view businesses"
  ON public.businesses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Businesses can insert their own record"
  ON public.businesses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Businesses can update their own record"
  ON public.businesses FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for verification_documents
CREATE POLICY "Prescribers can view their own documents"
  ON public.verification_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.prescribers 
      WHERE prescribers.id = verification_documents.prescriber_id 
      AND prescribers.user_id = auth.uid()
    )
  );

CREATE POLICY "Prescribers can upload their own documents"
  ON public.verification_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.prescribers 
      WHERE prescribers.id = prescriber_id 
      AND prescribers.user_id = auth.uid()
    )
  );

-- RLS Policies for availability
CREATE POLICY "Anyone can view availability"
  ON public.availability FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Prescribers can manage their own availability"
  ON public.availability FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.prescribers 
      WHERE prescribers.id = prescriber_id 
      AND prescribers.user_id = auth.uid()
    )
  );

CREATE POLICY "Prescribers can update their own availability"
  ON public.availability FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.prescribers 
      WHERE prescribers.id = prescriber_id 
      AND prescribers.user_id = auth.uid()
    )
  );

CREATE POLICY "Prescribers can delete their own availability"
  ON public.availability FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.prescribers 
      WHERE prescribers.id = prescriber_id 
      AND prescribers.user_id = auth.uid()
    )
  );

-- RLS Policies for bookings
CREATE POLICY "Users can view their own bookings"
  ON public.bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.prescribers 
      WHERE prescribers.id = bookings.prescriber_id 
      AND prescribers.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.businesses 
      WHERE businesses.id = bookings.business_id 
      AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Businesses can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses 
      WHERE businesses.id = business_id 
      AND businesses.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can update bookings"
  ON public.bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.prescribers 
      WHERE prescribers.id = bookings.prescriber_id 
      AND prescribers.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.businesses 
      WHERE businesses.id = bookings.business_id 
      AND businesses.user_id = auth.uid()
    )
  );

-- RLS Policies for payments
CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      JOIN public.prescribers ON prescribers.id = bookings.prescriber_id
      WHERE bookings.id = payments.booking_id
      AND prescribers.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.bookings
      JOIN public.businesses ON businesses.id = bookings.business_id
      WHERE bookings.id = payments.booking_id
      AND businesses.user_id = auth.uid()
    )
  );

-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false);

-- Storage policies for verification documents
CREATE POLICY "Prescribers can upload verification documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Prescribers can view their own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Storage policies for avatars
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
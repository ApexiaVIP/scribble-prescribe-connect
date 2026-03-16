import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type PrescriberType = Database['public']['Enums']['prescriber_type'];
type AvailabilityType = Database['public']['Enums']['availability_type'];

const prescriberTypeLabels: Record<PrescriberType, string> = {
  gp: 'General Practitioner (GMC)',
  pharmacist: 'Pharmacist (GPhC)',
  nurse_prescriber: 'Nurse Prescriber (NMC)',
  dentist: 'Dentist (GDC)',
  other: 'Other (GMC)',
};

const registerInfo: Record<PrescriberType, { register: string; url: string; numberLabel: string }> = {
  gp: { register: 'GMC', url: 'https://www.gmc-uk.org/registration-and-licensing/our-registers', numberLabel: 'GMC Reference Number (7 digits)' },
  pharmacist: { register: 'GPhC', url: 'https://www.pharmacyregulation.org/registers', numberLabel: 'GPhC Registration Number' },
  nurse_prescriber: { register: 'NMC', url: 'https://www.nmc.org.uk/registration/search-the-register/', numberLabel: 'NMC PIN Number' },
  dentist: { register: 'GDC', url: 'https://www.gdc-uk.org/registration/the-register', numberLabel: 'GDC Registration Number' },
  other: { register: 'GMC', url: 'https://www.gmc-uk.org/registration-and-licensing/our-registers', numberLabel: 'GMC Reference Number' },
};

export default function PrescriberOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    message: string;
    registrant_name?: string;
    status?: string;
  } | null>(null);

  // Step 1: Type & Registration
  const [prescriberType, setPrescriberType] = useState<PrescriberType>('gp');
  const [registrationNumber, setRegistrationNumber] = useState('');

  // Step 2: Profile Details
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [specialisations, setSpecialisations] = useState('');
  const [sectors, setSectors] = useState<string[]>([]);
  const [regionsCovered, setRegionsCovered] = useState('');
  const [availabilityTypes, setAvailabilityTypes] = useState<AvailabilityType[]>([]);

  const handleVerify = async () => {
    if (!registrationNumber.trim()) {
      toast({ title: 'Error', description: 'Please enter your registration number', variant: 'destructive' });
      return;
    }

    setVerifying(true);
    setVerificationResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('verify-prescriber', {
        body: {
          registration_number: registrationNumber.trim(),
          prescriber_type: prescriberType,
          full_name: user?.user_metadata?.full_name || '',
        },
      });

      if (error) throw error;

      setVerificationResult({
        verified: data.verified,
        message: data.message,
        registrant_name: data.registrant_name,
        status: data.status,
      });

      if (data.verified) {
        toast({ title: 'Verified!', description: `Your ${registerInfo[prescriberType].register} registration has been verified.` });
      }
    } catch (err) {
      console.error('Verification error:', err);
      toast({ title: 'Error', description: 'Verification service unavailable. You can continue and upload documents for manual verification.', variant: 'destructive' });
      setVerificationResult({
        verified: false,
        message: 'Verification service unavailable. You can continue and upload documents for manual review.',
        status: 'manual_review',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmitProfile = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const verificationStatus = verificationResult?.verified ? 'approved' : 'pending';

      const { error } = await supabase.from('prescribers').insert({
        user_id: user.id,
        prescriber_type: prescriberType,
        registration_number: registrationNumber.trim(),
        bio: bio.trim() || null,
        location: location.trim() || null,
        years_experience: yearsExperience ? parseInt(yearsExperience) : null,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        daily_rate: dailyRate ? parseFloat(dailyRate) : null,
        specialisations: specialisations ? specialisations.split(',').map(s => s.trim()).filter(Boolean) : null,
        sectors: sectors.length > 0 ? sectors : null,
        regions_covered: regionsCovered ? regionsCovered.split(',').map(r => r.trim()).filter(Boolean) : null,
        availability_types: availabilityTypes.length > 0 ? availabilityTypes : null,
        verification_status: verificationStatus as any,
        is_active: true,
      });

      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          toast({ title: 'Profile exists', description: 'You already have a prescriber profile.', variant: 'destructive' });
          navigate('/prescriber/dashboard');
          return;
        }
        throw error;
      }

      toast({
        title: verificationResult?.verified ? 'Profile Created & Verified!' : 'Profile Created!',
        description: verificationResult?.verified
          ? 'Your profile is live and visible to businesses.'
          : 'Your profile is under review. We\'ll verify your registration shortly.',
      });

      navigate('/prescriber/dashboard');
    } catch (err) {
      console.error('Profile creation error:', err);
      toast({ title: 'Error', description: 'Failed to create profile. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleSector = (sector: string) => {
    setSectors(prev => prev.includes(sector) ? prev.filter(s => s !== sector) : [...prev, sector]);
  };

  const toggleAvailability = (type: AvailabilityType) => {
    setAvailabilityTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  return (
    <div className="min-h-screen gradient-hero py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                step >= s ? 'gradient-primary text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
              </div>
              {s < 2 && <div className={`w-16 h-1 rounded ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <Card className="shadow-xl border-0">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
                Verify Your Registration
              </CardTitle>
              <CardDescription>
                We verify your registration against the official UK registers to ensure patient safety and build trust with businesses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Prescriber Type</Label>
                <Select value={prescriberType} onValueChange={(v) => { setPrescriberType(v as PrescriberType); setVerificationResult(null); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(prescriberTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{registerInfo[prescriberType].numberLabel}</Label>
                <Input
                  placeholder="Enter your registration number"
                  value={registrationNumber}
                  onChange={(e) => { setRegistrationNumber(e.target.value); setVerificationResult(null); }}
                />
                <p className="text-xs text-muted-foreground">
                  You can find this on the{' '}
                  <a href={registerInfo[prescriberType].url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {registerInfo[prescriberType].register} register
                  </a>
                </p>
              </div>

              <Button
                onClick={handleVerify}
                disabled={verifying || !registrationNumber.trim()}
                className="w-full gradient-primary border-0"
              >
                {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {verifying ? 'Verifying...' : `Verify with ${registerInfo[prescriberType].register}`}
              </Button>

              {verificationResult && (
                <Alert variant={verificationResult.verified ? 'default' : 'destructive'}>
                  {verificationResult.verified ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {verificationResult.verified ? 'Registration Verified' : 'Verification Incomplete'}
                  </AlertTitle>
                  <AlertDescription>
                    {verificationResult.message}
                    {verificationResult.registrant_name && (
                      <p className="mt-1 font-medium">Registrant: {verificationResult.registrant_name}</p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!registrationNumber.trim()}
                  className="flex-1 gradient-primary border-0"
                >
                  {verificationResult?.verified ? 'Continue' : 'Continue Anyway'}
                </Button>
              </div>

              {!verificationResult?.verified && registrationNumber.trim() && (
                <p className="text-xs text-muted-foreground text-center">
                  You can continue without auto-verification. Your profile will be manually reviewed.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="shadow-xl border-0">
            <CardHeader>
              <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
              <CardDescription>
                Fill in your details so businesses can find and hire you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Bio / About You</Label>
                <Textarea
                  placeholder="Tell businesses about your experience, qualifications, and what makes you stand out..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g. London, Manchester"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Years Experience</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 5"
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hourly Rate (£)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 50"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Daily Rate (£)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 350"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Specialisations</Label>
                <Input
                  placeholder="e.g. Aesthetics, Dermatology, Weight Management (comma-separated)"
                  value={specialisations}
                  onChange={(e) => setSpecialisations(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Regions Covered</Label>
                <Input
                  placeholder="e.g. London, South East, Nationwide (comma-separated)"
                  value={regionsCovered}
                  onChange={(e) => setRegionsCovered(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Sectors</Label>
                <div className="flex flex-wrap gap-2">
                  {['nhs', 'private', 'pharmacy', 'dental'].map((sector) => (
                    <Badge
                      key={sector}
                      variant={sectors.includes(sector) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleSector(sector)}
                    >
                      {sector === 'nhs' ? 'NHS' : sector.charAt(0).toUpperCase() + sector.slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Availability Types</Label>
                <div className="flex flex-wrap gap-2">
                  {(['hourly', 'daily', 'long_term'] as AvailabilityType[]).map((type) => (
                    <Badge
                      key={type}
                      variant={availabilityTypes.includes(type) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleAvailability(type)}
                    >
                      {type === 'long_term' ? 'Long Term' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleSubmitProfile}
                  disabled={loading}
                  className="flex-1 gradient-primary border-0"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? 'Creating Profile...' : 'Create Profile'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

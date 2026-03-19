import { useState, useRef } from 'react';
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
import { Loader2, ShieldCheck, AlertCircle, CheckCircle2, Upload, Camera, FileCheck, X } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type PrescriberType = Database['public']['Enums']['prescriber_type'];
type AvailabilityType = Database['public']['Enums']['availability_type'];

const TOTAL_STEPS = 3;

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

const documentTypeLabels: Record<string, string> = {
  uk_passport: 'UK Passport',
  uk_driving_licence: 'UK Driving Licence',
  biometric_residence_permit: 'Biometric Residence Permit',
  eu_id_card: 'EU/EEA ID Card',
  armed_forces_id: 'Armed Forces ID',
  unknown: 'Unknown Document',
};

interface IdVerificationResult {
  is_valid_id: boolean;
  document_type: string;
  name_on_document: string;
  name_matches: boolean;
  is_legible: boolean;
  confidence: string;
  issues: string[];
  summary: string;
  stored: boolean;
  storage_path: string | null;
}

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

  // Step 2: ID Verification
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [idVerifying, setIdVerifying] = useState(false);
  const [idResult, setIdResult] = useState<IdVerificationResult | null>(null);

  // Step 3: Profile Details
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file (JPEG, PNG, etc.)', variant: 'destructive' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please upload an image under 10MB', variant: 'destructive' });
      return;
    }

    setIdFile(file);
    setIdResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      setIdPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearIdFile = () => {
    setIdFile(null);
    setIdPreview(null);
    setIdResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleVerifyId = async () => {
    if (!idPreview || !user) return;

    setIdVerifying(true);
    setIdResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('verify-id-document', {
        body: {
          image_base64: idPreview,
          file_name: idFile?.name || 'id-document',
          prescriber_name: user.user_metadata?.full_name || '',
        },
      });

      if (error) throw error;

      setIdResult(data as IdVerificationResult);

      if (data.is_valid_id && data.name_matches) {
        toast({ title: 'ID Verified!', description: 'Your photo ID has been verified successfully.' });
      } else if (data.is_valid_id && !data.name_matches) {
        toast({ title: 'ID Detected', description: 'Valid ID found, but the name may not match. Please check.', variant: 'destructive' });
      } else {
        toast({ title: 'Verification Issue', description: data.summary || 'Could not verify the document.', variant: 'destructive' });
      }
    } catch (err) {
      console.error('ID verification error:', err);
      toast({ title: 'Error', description: 'ID verification service unavailable. You can continue and your ID will be reviewed manually.', variant: 'destructive' });
    } finally {
      setIdVerifying(false);
    }
  };

  const handleSubmitProfile = async () => {
    if (!user) return;

    setLoading(true);

    try {
      // verification_status is always 'pending' on insert - approval happens server-side only
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
        verification_status: 'pending' as any,
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

      // If we have an ID result with a storage path, also insert into verification_documents
      if (idResult?.storage_path) {
        const { data: prescriberData } = await supabase
          .from('prescribers')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (prescriberData) {
          await supabase.from('verification_documents').insert({
            prescriber_id: prescriberData.id,
            document_type: 'photo_id',
            document_url: idResult.storage_path,
            status: idVerified ? 'approved' : 'pending' as any,
          });
        }
      }

      toast({
        title: verificationStatus === 'approved' ? 'Profile Created & Verified!' : 'Profile Created!',
        description: verificationStatus === 'approved'
          ? 'Your profile is live and visible to businesses.'
          : 'Your profile is under review. We\'ll verify your details shortly.',
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

  const idVerified = idResult?.is_valid_id && idResult?.name_matches;

  return (
    <div className="min-h-screen gradient-hero py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                step >= s ? 'gradient-primary text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
              </div>
              {s < TOTAL_STEPS && <div className={`w-16 h-1 rounded ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Registration Verification */}
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
                <Button variant="outline" onClick={() => navigate('/')} className="flex-1">
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

        {/* Step 2: ID Verification */}
        {step === 2 && (
          <Card className="shadow-xl border-0">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <FileCheck className="h-6 w-6 text-primary" />
                Verify Your Identity
              </CardTitle>
              <CardDescription>
                Upload a photo of your UK-issued photo ID. We use AI to verify it instantly. Accepted: UK Passport, Driving Licence, Biometric Residence Permit, or EU/EEA ID Card.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload area */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />

              {!idPreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Camera className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Take a photo or upload your ID</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        JPEG, PNG up to 10MB
                      </p>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button type="button" size="sm" variant="outline" className="gap-1.5">
                        <Camera className="h-4 w-4" /> Camera
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="gap-1.5">
                        <Upload className="h-4 w-4" /> Upload
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden border border-border">
                    <img
                      src={idPreview}
                      alt="ID Document Preview"
                      className="w-full max-h-72 object-contain bg-muted"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={clearIdFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {!idResult && (
                    <Button
                      onClick={handleVerifyId}
                      disabled={idVerifying}
                      className="w-full gradient-primary border-0"
                    >
                      {idVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {idVerifying ? 'Analysing document...' : 'Verify ID Document'}
                    </Button>
                  )}
                </div>
              )}

              {/* Verification Result */}
              {idResult && (
                <Alert variant={idResult.is_valid_id && idResult.name_matches ? 'default' : 'destructive'}>
                  {idResult.is_valid_id && idResult.name_matches ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {idResult.is_valid_id && idResult.name_matches
                      ? 'ID Verified Successfully'
                      : idResult.is_valid_id
                        ? 'ID Detected — Name Mismatch'
                        : 'ID Verification Failed'}
                  </AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>{idResult.summary}</p>
                    {idResult.document_type && idResult.document_type !== 'unknown' && (
                      <p className="text-sm">
                        <span className="font-medium">Document type:</span>{' '}
                        {documentTypeLabels[idResult.document_type] || idResult.document_type}
                      </p>
                    )}
                    {idResult.name_on_document && (
                      <p className="text-sm">
                        <span className="font-medium">Name on ID:</span> {idResult.name_on_document}
                      </p>
                    )}
                    {idResult.confidence && (
                      <p className="text-sm">
                        <span className="font-medium">Confidence:</span>{' '}
                        <Badge variant={idResult.confidence === 'high' ? 'default' : 'outline'} className="ml-1">
                          {idResult.confidence}
                        </Badge>
                      </p>
                    )}
                    {idResult.issues.length > 0 && (
                      <div className="text-sm">
                        <span className="font-medium">Issues:</span>
                        <ul className="list-disc list-inside mt-1">
                          {idResult.issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {!idResult.is_valid_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={clearIdFile}
                      >
                        Try a different photo
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!idPreview}
                  className="flex-1 gradient-primary border-0"
                >
                  {idVerified ? 'Continue' : 'Continue Without ID Verification'}
                </Button>
              </div>

              {!idVerified && idPreview && (
                <p className="text-xs text-muted-foreground text-center">
                  You can continue without AI verification. Your ID will be reviewed manually by our team.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Profile Details */}
        {step === 3 && (
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
                  <Input placeholder="e.g. London, Manchester" value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Years Experience</Label>
                  <Input type="number" placeholder="e.g. 5" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hourly Rate (£)</Label>
                  <Input type="number" placeholder="e.g. 50" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Daily Rate (£)</Label>
                  <Input type="number" placeholder="e.g. 350" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} />
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
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
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

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  ShieldCheck, AlertCircle, User, Mail, Phone,
  Stethoscope, BadgeCheck, MapPin, GraduationCap,
  PoundSterling, FileCheck, Clock, Briefcase
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type VerificationDocument = Database['public']['Tables']['verification_documents']['Row'];

type Prescriber = Database['public']['Tables']['prescribers']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type PrescriberType = Database['public']['Enums']['prescriber_type'];

const prescriberTypeLabels: Record<PrescriberType, string> = {
  gp: 'General Practitioner',
  pharmacist: 'Pharmacist',
  nurse_prescriber: 'Nurse Prescriber',
  dentist: 'Dentist',
  other: 'Other',
};

const availabilityTypeLabels: Record<string, string> = {
  hourly: 'Hourly',
  daily: 'Daily',
  long_term: 'Long Term',
};

const statusVariant: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
};

export default function Profile() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [prescriber, setPrescriber] = useState<Prescriber | null>(null);
  const [verificationDocs, setVerificationDocs] = useState<VerificationDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    setProfile(profileData);

    const { data: prescriberData } = await supabase
      .from('prescribers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    setPrescriber(prescriberData);

    // Fetch verification documents if prescriber
    if (prescriberData) {
      const { data: docsData } = await supabase
        .from('verification_documents')
        .select('*')
        .eq('prescriber_id', prescriberData.id)
        .order('uploaded_at', { ascending: false });

      setVerificationDocs(docsData || []);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </Layout>
    );
  }

  const registerType = prescriber?.prescriber_type === 'pharmacist' ? 'GPhC' : 'GMC';
  const registerUrl = prescriber?.prescriber_type === 'pharmacist'
    ? `https://www.pharmacyregulation.org/registers/pharmacist/registrationnumber/${prescriber?.registration_number}`
    : `https://www.gmc-uk.org/registrants/${prescriber?.registration_number}`;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>

        {/* Account Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Full Name</p>
                <p className="font-medium">{profile?.full_name || user?.user_metadata?.full_name || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Email</p>
                <p className="font-medium flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  {profile?.email || user?.email}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Phone</p>
                <p className="font-medium flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  {profile?.phone || '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Account Type</p>
                <Badge variant="outline" className="capitalize">{userRole || '—'}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Registration - only for prescribers */}
        {prescriber && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Professional Registration
                </CardTitle>
                <CardDescription>
                  Linked to the {registerType} register
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Prescriber Type</p>
                    <p className="font-medium">{prescriberTypeLabels[prescriber.prescriber_type]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Registration Number</p>
                    <p className="font-medium">
                      <a
                        href={registerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {prescriber.registration_number}
                      </a>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Register</p>
                    <p className="font-medium">{registerType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Verification Status</p>
                    <Badge className={statusVariant[prescriber.verification_status] || ''}>
                      {prescriber.verification_status === 'approved' && <BadgeCheck className="h-3 w-3 mr-1" />}
                      {prescriber.verification_status === 'pending' && <AlertCircle className="h-3 w-3 mr-1" />}
                      {prescriber.verification_status.charAt(0).toUpperCase() + prescriber.verification_status.slice(1)}
                    </Badge>
                  </div>
                </div>

                {prescriber.verification_status === 'approved' && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mt-2">
                    <div className="flex items-start gap-3">
                      <BadgeCheck className="h-5 w-5 text-emerald-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-emerald-800">Registration Verified</p>
                        <p className="text-sm text-emerald-700">
                          Your {registerType} registration ({prescriber.registration_number}) has been verified against the official register.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Identity Verification */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-primary" />
                  Identity Verification
                </CardTitle>
                <CardDescription>
                  Your uploaded photo ID — only visible to you
                </CardDescription>
              </CardHeader>
              <CardContent>
                {verificationDocs.length > 0 ? (
                  <div className="space-y-3">
                    {verificationDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <FileCheck className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm capitalize">{doc.document_type.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-muted-foreground">
                              Uploaded {new Date(doc.uploaded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <Badge className={statusVariant[doc.status] || ''}>
                          {doc.status === 'approved' && <BadgeCheck className="h-3 w-3 mr-1" />}
                          {doc.status === 'pending' && <AlertCircle className="h-3 w-3 mr-1" />}
                          {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <FileCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No ID document uploaded yet</p>
                    <p className="text-xs mt-1">Upload during onboarding or contact support</p>
                  </div>
                )}
              </CardContent>
            </Card>


            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  Professional Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Location</p>
                    <p className="font-medium flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {prescriber.location || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Experience</p>
                    <p className="font-medium flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                      {prescriber.years_experience ? `${prescriber.years_experience} years` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Hourly Rate</p>
                    <p className="font-medium flex items-center gap-1.5">
                      <PoundSterling className="h-3.5 w-3.5 text-muted-foreground" />
                      {prescriber.hourly_rate ? `£${Number(prescriber.hourly_rate).toFixed(0)}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Daily Rate</p>
                    <p className="font-medium flex items-center gap-1.5">
                      <PoundSterling className="h-3.5 w-3.5 text-muted-foreground" />
                      {prescriber.daily_rate ? `£${Number(prescriber.daily_rate).toFixed(0)}` : '—'}
                    </p>
                  </div>
                </div>

                {prescriber.bio && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Bio</p>
                    <p className="text-sm whitespace-pre-line">{prescriber.bio}</p>
                  </div>
                )}

                {prescriber.specialisations && prescriber.specialisations.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Specialisations</p>
                    <div className="flex flex-wrap gap-2">
                      {prescriber.specialisations.map((s) => (
                        <Badge key={s} variant="secondary">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {prescriber.sectors && prescriber.sectors.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Sectors</p>
                    <div className="flex flex-wrap gap-2">
                      {prescriber.sectors.map((s) => (
                        <Badge key={s} variant="outline" className="capitalize">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {prescriber.availability_types && prescriber.availability_types.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Availability Types</p>
                    <div className="flex flex-wrap gap-2">
                      {prescriber.availability_types.map((type) => (
                        <Badge key={type} variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          {availabilityTypeLabels[type] || type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {prescriber.regions_covered && prescriber.regions_covered.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Regions Covered</p>
                    <div className="flex flex-wrap gap-2">
                      {prescriber.regions_covered.map((r) => (
                        <Badge key={r} variant="outline">
                          <MapPin className="h-3 w-3 mr-1" /> {r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}

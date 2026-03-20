import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, BadgeCheck, MapPin, Clock, Stethoscope,
  PoundSterling, Briefcase, GraduationCap
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Prescriber = Database['public']['Tables']['prescribers']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
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

export default function PrescriberProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [prescriber, setPrescriber] = useState<Prescriber | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hasVerifiedId, setHasVerifiedId] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchPrescriber();
  }, [id]);

  const fetchPrescriber = async () => {
    const { data: prescriberData, error } = await supabase
      .from('prescribers')
      .select('*')
      .eq('id', id!)
      .eq('is_active', true)
      .single();

    if (error || !prescriberData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setPrescriber(prescriberData);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', prescriberData.user_id)
      .single();

    setProfile(profileData);

    // Check if prescriber has a verified ID document (don't expose the document itself)
    const { data: docsData } = await supabase
      .from('verification_documents')
      .select('status')
      .eq('prescriber_id', prescriberData.id)
      .eq('status', 'approved')
      .limit(1);

    setHasVerifiedId((docsData?.length || 0) > 0);
    setLoading(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </Layout>
    );
  }

  if (notFound) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Stethoscope className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Prescriber Not Found</h1>
          <p className="text-muted-foreground mb-6">This profile doesn't exist or is no longer active.</p>
          <Button asChild>
            <Link to="/browse">Browse Prescribers</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        {/* Header Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-5">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Stethoscope className="h-10 w-10 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold truncate">
                    {profile?.full_name || 'Unknown'}
                  </h1>
                  {prescriber?.verification_status === 'approved' && (
                    <BadgeCheck className="h-5 w-5 text-primary shrink-0" />
                  )}
                </div>
                <p className="text-muted-foreground">
                  {prescriberTypeLabels[prescriber!.prescriber_type]}
                </p>

                <div className="flex flex-wrap gap-2 mt-3">
                  {prescriber?.location && (
                    <Badge variant="outline">
                      <MapPin className="h-3 w-3 mr-1" /> {prescriber.location}
                    </Badge>
                  )}
                  {prescriber?.years_experience && (
                    <Badge variant="outline">
                      <GraduationCap className="h-3 w-3 mr-1" /> {prescriber.years_experience} years exp.
                    </Badge>
                  )}
                  {prescriber?.verification_status === 'approved' && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                      <BadgeCheck className="h-3 w-3 mr-1" /> Registration Verified
                    </Badge>
                  )}
                  {hasVerifiedId && (
                    <Badge className="bg-sky-100 text-sky-800 border-sky-200">
                      <FileCheck className="h-3 w-3 mr-1" /> ID Verified
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {prescriber?.bio && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line">{prescriber.bio}</p>
                </CardContent>
              </Card>
            )}

            {prescriber?.specialisations && prescriber.specialisations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Specialisations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {prescriber.specialisations.map((s) => (
                      <Badge key={s} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {prescriber?.sectors && prescriber.sectors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sectors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {prescriber.sectors.map((s) => (
                      <Badge key={s} variant="outline" className="capitalize">{s}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {prescriber?.regions_covered && prescriber.regions_covered.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Regions Covered</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {prescriber.regions_covered.map((r) => (
                      <Badge key={r} variant="outline">
                        <MapPin className="h-3 w-3 mr-1" /> {r}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {prescriber?.hourly_rate && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Hourly</span>
                    <span className="font-bold text-lg flex items-center">
                      <PoundSterling className="h-4 w-4 mr-0.5" />
                      {Number(prescriber.hourly_rate).toFixed(0)}
                    </span>
                  </div>
                )}
                {prescriber?.daily_rate && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Daily</span>
                    <span className="font-bold text-lg flex items-center">
                      <PoundSterling className="h-4 w-4 mr-0.5" />
                      {Number(prescriber.daily_rate).toFixed(0)}
                    </span>
                  </div>
                )}
                {!prescriber?.hourly_rate && !prescriber?.daily_rate && (
                  <p className="text-sm text-muted-foreground">Rates not specified</p>
                )}
              </CardContent>
            </Card>

            {prescriber?.availability_types && prescriber.availability_types.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Availability</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {prescriber.availability_types.map((type) => (
                      <Badge key={type} variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        {availabilityTypeLabels[type] || type}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Registration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Register</span>
                  <span className="font-medium uppercase">
                    {prescriber?.prescriber_type === 'pharmacist' ? 'GPhC' : 'GMC'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Number</span>
                  <span className="font-medium">{prescriber?.registration_number}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

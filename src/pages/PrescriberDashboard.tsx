import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, Clock, DollarSign, ShieldCheck, AlertCircle, 
  MapPin, Star, Settings, Plus, CheckCircle2 
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Prescriber = Database['public']['Tables']['prescribers']['Row'];
type Booking = Database['public']['Tables']['bookings']['Row'];

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export default function PrescriberDashboard() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [prescriber, setPrescriber] = useState<Prescriber | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (userRole && userRole !== 'prescriber') {
      navigate('/business/dashboard');
      return;
    }
    fetchData();
  }, [user, userRole]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch prescriber profile
    const { data: prescriberData } = await supabase
      .from('prescribers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!prescriberData) {
      // No prescriber profile - redirect to onboarding
      navigate('/prescriber/onboarding');
      return;
    }

    setPrescriber(prescriberData);

    // Fetch bookings
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('*')
      .eq('prescriber_id', prescriberData.id)
      .order('booking_date', { ascending: false })
      .limit(10);

    setBookings(bookingsData || []);
    setLoading(false);
  };

  const handleBookingAction = async (bookingId: string, status: 'accepted' | 'declined') => {
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId);

    if (!error) {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      </Layout>
    );
  }

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const upcomingBookings = bookings.filter(b => b.status === 'accepted' && new Date(b.booking_date) >= new Date());

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Prescriber Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage your profile, availability, and bookings
            </p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <Badge variant={prescriber?.verification_status === 'approved' ? 'default' : 'secondary'} className="h-8">
              {prescriber?.verification_status === 'approved' ? (
                <><ShieldCheck className="h-3 w-3 mr-1" /> Verified</>
              ) : (
                <><AlertCircle className="h-3 w-3 mr-1" /> Pending Verification</>
              )}
            </Badge>
          </div>
        </div>

        {/* Verification Warning */}
        {prescriber?.verification_status !== 'approved' && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Profile Under Review</p>
                <p className="text-sm text-yellow-700">
                  Your registration is being verified. Your profile won't appear in search results until verified.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Pending</span>
              </div>
              <p className="text-2xl font-bold">{pendingBookings.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">Upcoming</span>
              </div>
              <p className="text-2xl font-bold">{upcomingBookings.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Hourly Rate</span>
              </div>
              <p className="text-2xl font-bold">{prescriber?.hourly_rate ? `£${prescriber.hourly_rate}` : '—'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">Location</span>
              </div>
              <p className="text-lg font-bold truncate">{prescriber?.location || '—'}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Pending Bookings */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
                <CardDescription>Manage your booking requests</CardDescription>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>No bookings yet</p>
                    <p className="text-sm">Bookings from businesses will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 rounded-lg border">
                        <div>
                          <p className="font-medium">{new Date(booking.booking_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.start_time} - {booking.end_time} • £{Number(booking.total_amount).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={statusColors[booking.status]}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </Badge>
                          {booking.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button size="sm" onClick={() => handleBookingAction(booking.id, 'accepted')}>
                                Accept
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleBookingAction(booking.id, 'declined')}>
                                Decline
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/prescriber/profile">
                    <Settings className="h-4 w-4 mr-2" /> Edit Profile
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/prescriber/availability">
                    <Plus className="h-4 w-4 mr-2" /> Manage Availability
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Profile Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium capitalize">{prescriber?.prescriber_type?.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registration</span>
                  <span className="font-medium">{prescriber?.registration_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Experience</span>
                  <span className="font-medium">{prescriber?.years_experience ? `${prescriber.years_experience} years` : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={prescriber?.is_active ? 'default' : 'secondary'} className="text-xs">
                    {prescriber?.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar, Search, Building2, DollarSign, Clock,
  Plus, CheckCircle2, AlertCircle
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Business = Database['public']['Tables']['businesses']['Row'];
type Booking = Database['public']['Tables']['bookings']['Row'];

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export default function BusinessDashboard() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [business, setBusiness] = useState<Business | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  // Business setup form
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [businessLocation, setBusinessLocation] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (userRole && userRole !== 'business') {
      navigate('/prescriber/dashboard');
      return;
    }
    fetchData();
  }, [user, userRole]);

  const fetchData = async () => {
    if (!user) return;

    const { data: businessData } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!businessData) {
      setShowSetup(true);
      setLoading(false);
      return;
    }

    setBusiness(businessData);

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('*')
      .eq('business_id', businessData.id)
      .order('booking_date', { ascending: false })
      .limit(10);

    setBookings(bookingsData || []);
    setLoading(false);
  };

  const handleSetupBusiness = async () => {
    if (!user || !businessName.trim()) return;

    setSetupLoading(true);
    const { data, error } = await supabase.from('businesses').insert({
      user_id: user.id,
      business_name: businessName.trim(),
      business_type: businessType.trim() || null,
      location: businessLocation.trim() || null,
    }).select().single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to create business profile', variant: 'destructive' });
    } else {
      setBusiness(data);
      setShowSetup(false);
      toast({ title: 'Welcome!', description: 'Your business profile has been created.' });
    }
    setSetupLoading(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (showSetup) {
    return (
      <Layout>
        <div className="min-h-[70vh] flex items-center justify-center px-4">
          <Card className="max-w-md w-full shadow-xl border-0">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Set Up Your Business</CardTitle>
              <CardDescription>Tell us about your business to start hiring prescribers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Business Name *</Label>
                <Input placeholder="e.g. Smith's Pharmacy" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Business Type</Label>
                <Input placeholder="e.g. Pharmacy, Clinic, Hospital" value={businessType} onChange={(e) => setBusinessType(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input placeholder="e.g. London" value={businessLocation} onChange={(e) => setBusinessLocation(e.target.value)} />
              </div>
              <Button onClick={handleSetupBusiness} disabled={setupLoading || !businessName.trim()} className="w-full gradient-primary border-0">
                {setupLoading ? 'Creating...' : 'Create Business Profile'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const activeBookings = bookings.filter(b => b.status === 'accepted');

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{business?.business_name}</h1>
            <p className="text-muted-foreground mt-1">Business Dashboard</p>
          </div>
          <Button asChild className="mt-4 md:mt-0 gradient-primary border-0">
            <Link to="/browse">
              <Search className="h-4 w-4 mr-2" /> Find Prescribers
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Pending</span>
              </div>
              <p className="text-2xl font-bold">{pendingBookings.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">Active</span>
              </div>
              <p className="text-2xl font-bold">{activeBookings.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Total Bookings</span>
              </div>
              <p className="text-2xl font-bold">{bookings.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Total Spent</span>
              </div>
              <p className="text-2xl font-bold">
                £{bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + Number(b.total_amount), 0).toFixed(0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Your Bookings</CardTitle>
            <CardDescription>Track and manage your prescriber bookings</CardDescription>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No bookings yet</p>
                <p className="text-sm mb-4">Find and book a prescriber to get started</p>
                <Button asChild>
                  <Link to="/browse">Browse Prescribers</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium">
                        {new Date(booking.booking_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking.start_time} - {booking.end_time} • £{Number(booking.total_amount).toFixed(2)}
                      </p>
                    </div>
                    <Badge className={statusColors[booking.status]}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

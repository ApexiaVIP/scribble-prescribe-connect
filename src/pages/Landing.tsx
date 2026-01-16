import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  CalendarCheck, 
  CreditCard, 
  ShieldCheck,
  ArrowRight,
  Stethoscope,
  Building2,
  Clock,
  Star,
  CheckCircle2,
  MapPin,
  BadgeCheck
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const prescriberTypeLabels: Record<string, string> = {
  gp: 'GP',
  pharmacist: 'Pharmacist',
  nurse_prescriber: 'Nurse Prescriber',
  dentist: 'Dentist',
  other: 'Other'
};

export default function Landing() {
  // Fetch available prescribers with profiles
  const { data: prescribers, isLoading } = useQuery({
    queryKey: ['available-prescribers'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Get prescribers who have availability today or in the future
      const { data: availablePrescribers, error } = await supabase
        .from('prescribers')
        .select(`
          id,
          prescriber_type,
          daily_rate,
          hourly_rate,
          location,
          verification_status,
          user_id,
          availability!inner (
            date,
            availability_type,
            is_booked
          )
        `)
        .eq('is_active', true)
        .eq('verification_status', 'approved')
        .gte('availability.date', today)
        .eq('availability.is_booked', false)
        .limit(6);

      if (error) throw error;

      // Get profiles for these prescribers
      const userIds = availablePrescribers?.map(p => p.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      // Merge profiles with prescribers
      return availablePrescribers?.map(p => ({
        ...p,
        profile: profiles?.find(prof => prof.user_id === p.user_id)
      })) || [];
    }
  });

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative gradient-hero overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
              🇬🇧 UK's Leading Prescriber Marketplace
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
              Find Verified <span className="text-gradient-primary">Prescribers</span> For Your Business
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Connect with qualified GPs, pharmacists, nurse prescribers and dentists. 
              Book instantly, pay securely, and solve your staffing challenges.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="gradient-primary border-0 text-lg px-8 h-14">
                <Link to="/auth?mode=signup">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg px-8 h-14">
                <Link to="/browse">Browse Prescribers</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              No credit card required • Free to browse
            </p>
          </div>
        </div>
        
        {/* Decorative gradient blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </section>

      {/* Trust Badges */}
      <section className="border-b bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">GMC/NMC Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Secure Payments</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Instant Booking</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Rated 4.9/5</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Book a Prescriber in Minutes
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our streamlined process makes finding and booking qualified prescribers effortless.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Search,
                step: '01',
                title: 'Search & Filter',
                description: 'Browse verified prescribers by type, location, availability, and specialisation.'
              },
              {
                icon: CalendarCheck,
                step: '02',
                title: 'Book Instantly',
                description: 'Select available slots from their calendar and send a booking request.'
              },
              {
                icon: CreditCard,
                step: '03',
                title: 'Pay Securely',
                description: 'Complete payment through our secure platform. Funds released after work completion.'
              }
            ].map((item, index) => (
              <Card key={index} className="relative group hover-lift border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="absolute -top-4 -left-4 w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-white font-bold">
                    {item.step}
                  </div>
                  <div className="pt-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                      <item.icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* For Businesses & Prescribers */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* For Businesses */}
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="h-2 gradient-primary" />
              <CardContent className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <Badge>For Businesses</Badge>
                    <h3 className="text-2xl font-bold mt-1">Hire Prescribers</h3>
                  </div>
                </div>
                <ul className="space-y-4 mb-8">
                  {[
                    'Access verified prescribers instantly',
                    'Flexible hourly, daily, or long-term options',
                    'Secure payments with platform protection',
                    'No upfront costs or subscription fees'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Button size="lg" asChild className="w-full gradient-primary border-0">
                  <Link to="/auth?mode=signup">Start Hiring</Link>
                </Button>
              </CardContent>
            </Card>

            {/* For Prescribers */}
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="h-2 gradient-accent" />
              <CardContent className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <Stethoscope className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <Badge variant="secondary">For Prescribers</Badge>
                    <h3 className="text-2xl font-bold mt-1">Find Work</h3>
                  </div>
                </div>
                <ul className="space-y-4 mb-8">
                  {[
                    'Set your own rates and availability',
                    'Get verified and stand out',
                    'Receive secure payments on time',
                    'Work with leading UK healthcare businesses'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-secondary mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Button size="lg" variant="secondary" asChild className="w-full">
                  <Link to="/auth?mode=signup">Join as Prescriber</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Available Now Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Available Now</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Prescribers Ready to Work
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Verified professionals with open availability. Book today.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              // Skeleton loading state
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Skeleton className="w-16 h-16 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-9 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : prescribers && prescribers.length > 0 ? (
              prescribers.map((prescriber) => (
                <Card key={prescriber.id} className="overflow-hidden hover-lift group">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                        <Stethoscope className="h-7 w-7 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold truncate">
                            {prescriber.profile?.full_name || 'Verified Prescriber'}
                          </h4>
                          {prescriber.verification_status === 'approved' && (
                            <BadgeCheck className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {prescriberTypeLabels[prescriber.prescriber_type]}
                        </p>
                        {prescriber.location && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{prescriber.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                      <div>
                        {prescriber.daily_rate ? (
                          <span className="font-bold text-lg">
                            £{prescriber.daily_rate}<span className="text-sm font-normal text-muted-foreground">/day</span>
                          </span>
                        ) : prescriber.hourly_rate ? (
                          <span className="font-bold text-lg">
                            £{prescriber.hourly_rate}<span className="text-sm font-normal text-muted-foreground">/hr</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Contact for rates</span>
                        )}
                      </div>
                      <Button size="sm" variant="outline" asChild className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Link to="/auth?mode=signup">View Profile</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              // Empty state
              <div className="col-span-full text-center py-12">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Stethoscope className="h-10 w-10 text-muted-foreground" />
                </div>
                <h4 className="font-semibold mb-2">No prescribers available yet</h4>
                <p className="text-muted-foreground mb-4">Be the first to join as a prescriber!</p>
                <Button asChild>
                  <Link to="/auth?mode=signup">Join as Prescriber</Link>
                </Button>
              </div>
            )}
          </div>

          {prescribers && prescribers.length > 0 && (
            <div className="text-center mt-10">
              <Button size="lg" variant="outline" asChild>
                <Link to="/browse">
                  View All Prescribers
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Prescriber Types */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Prescriber Types</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              All Types of Prescribers
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From GPs to pharmacists, find the right prescriber for your needs.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { title: 'GPs', description: 'General Practitioners' },
              { title: 'Pharmacists', description: 'Independent Prescribers' },
              { title: 'Nurse Prescribers', description: 'Qualified NMC registered' },
              { title: 'Dentists', description: 'Dental Prescribers' }
            ].map((type, i) => (
              <Link key={i} to="/browse">
                <Card className="text-center hover-lift cursor-pointer group h-full">
                  <CardContent className="p-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-4 group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
                      <Stethoscope className="h-8 w-8 text-primary" />
                    </div>
                    <h4 className="font-bold mb-1">{type.title}</h4>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-hero">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join hundreds of UK healthcare businesses and prescribers already using Scribify.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="gradient-primary border-0 text-lg px-8 h-14">
                <Link to="/auth?mode=signup">
                  Create Free Account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg px-8 h-14">
                <Link to="/browse">Browse Prescribers</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

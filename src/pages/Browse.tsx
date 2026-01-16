import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  MapPin, 
  Clock, 
  BadgeCheck,
  Stethoscope,
  Filter,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Database } from '@/integrations/supabase/types';

type Prescriber = Database['public']['Tables']['prescribers']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type PrescriberType = Database['public']['Enums']['prescriber_type'];

interface PrescriberWithProfile extends Prescriber {
  profiles: Profile | null;
}

const prescriberTypeLabels: Record<PrescriberType, string> = {
  gp: 'General Practitioner',
  pharmacist: 'Pharmacist',
  nurse_prescriber: 'Nurse Prescriber',
  dentist: 'Dentist',
  other: 'Other'
};

const availabilityTypeLabels = {
  hourly: 'Hourly',
  daily: 'Daily',
  long_term: 'Long Term'
};

export default function Browse() {
  const [prescribers, setPrescribers] = useState<PrescriberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    location: '',
    availability: '',
    sector: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchPrescribers();
  }, []);

  const fetchPrescribers = async () => {
    setLoading(true);
    
    const { data: prescribersData, error } = await supabase
      .from('prescribers')
      .select('*')
      .eq('is_active', true)
      .eq('verification_status', 'approved');

    if (!error && prescribersData) {
      // Fetch profiles for each prescriber
      const userIds = prescribersData.map(p => p.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);
      
      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      
      const combined = prescribersData.map(p => ({
        ...p,
        profiles: profilesMap.get(p.user_id) || null
      }));
      
      setPrescribers(combined);
    }
    
    setLoading(false);
  };

  const filteredPrescribers = prescribers.filter(p => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const nameMatch = p.profiles?.full_name?.toLowerCase().includes(searchLower);
      const bioMatch = p.bio?.toLowerCase().includes(searchLower);
      const locationMatch = p.location?.toLowerCase().includes(searchLower);
      if (!nameMatch && !bioMatch && !locationMatch) return false;
    }

    // Type filter
    if (filters.type && p.prescriber_type !== filters.type) return false;

    // Location filter
    if (filters.location && !p.location?.toLowerCase().includes(filters.location.toLowerCase())) return false;

    // Availability filter
    if (filters.availability && !p.availability_types?.includes(filters.availability as any)) return false;

    // Sector filter
    if (filters.sector && !p.sectors?.includes(filters.sector)) return false;

    return true;
  });

  const clearFilters = () => {
    setFilters({ type: '', location: '', availability: '', sector: '' });
    setSearch('');
  };

  const hasActiveFilters = search || Object.values(filters).some(v => v);

  return (
    <Layout>
      <div className="bg-muted/30 min-h-screen">
        {/* Header */}
        <div className="bg-background border-b">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Find Prescribers</h1>
            <p className="text-muted-foreground">
              Browse verified prescribers available for hire across the UK
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Search & Filters */}
          <div className="bg-background rounded-xl shadow-sm border p-4 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, location, or keyword..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className="md:w-auto"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2">Active</Badge>
                )}
              </Button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                <Select value={filters.type} onValueChange={(v) => setFilters({...filters, type: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Prescriber Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gp">General Practitioner</SelectItem>
                    <SelectItem value="pharmacist">Pharmacist</SelectItem>
                    <SelectItem value="nurse_prescriber">Nurse Prescriber</SelectItem>
                    <SelectItem value="dentist">Dentist</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Location"
                  value={filters.location}
                  onChange={(e) => setFilters({...filters, location: e.target.value})}
                />

                <Select value={filters.availability} onValueChange={(v) => setFilters({...filters, availability: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="long_term">Long Term</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.sector} onValueChange={(v) => setFilters({...filters, sector: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sector" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nhs">NHS</SelectItem>
                    <SelectItem value="private">Private Clinic</SelectItem>
                    <SelectItem value="pharmacy">Pharmacy</SelectItem>
                    <SelectItem value="dental">Dental</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground">
                    <X className="h-4 w-4 mr-2" />
                    Clear all
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Results */}
          <div className="mb-4 text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${filteredPrescribers.length} prescribers found`}
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-16 w-16 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full mt-4" />
                    <div className="flex gap-2 mt-4">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredPrescribers.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No prescribers found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search or filters to find more results.
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPrescribers.map((prescriber) => (
                <Link key={prescriber.id} to={`/prescriber/${prescriber.id}`}>
                  <Card className="h-full hover-lift cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Stethoscope className="h-8 w-8 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">
                              {prescriber.profiles?.full_name || 'Unknown'}
                            </h3>
                            {prescriber.verification_status === 'approved' && (
                              <BadgeCheck className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {prescriberTypeLabels[prescriber.prescriber_type]}
                          </p>
                        </div>
                      </div>

                      {prescriber.bio && (
                        <p className="text-sm text-muted-foreground mt-4 line-clamp-2">
                          {prescriber.bio}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mt-4">
                        {prescriber.location && (
                          <Badge variant="outline" className="text-xs">
                            <MapPin className="h-3 w-3 mr-1" />
                            {prescriber.location}
                          </Badge>
                        )}
                        {prescriber.availability_types?.slice(0, 2).map((type) => (
                          <Badge key={type} variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {availabilityTypeLabels[type]}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <div>
                          {prescriber.hourly_rate && (
                            <span className="text-lg font-bold">
                              £{Number(prescriber.hourly_rate).toFixed(0)}
                              <span className="text-sm font-normal text-muted-foreground">/hr</span>
                            </span>
                          )}
                        </div>
                        <Button size="sm" variant="ghost" className="text-primary">
                          View Profile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

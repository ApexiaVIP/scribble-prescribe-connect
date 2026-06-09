const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Normalize a name string for comparison: lowercase, strip accents/punctuation,
// collapse whitespace, and return tokens.
function tokenizeName(name: string): string[] {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(dr|doctor|mr|mrs|miss|ms|mx|prof|professor)\b\.?/g, '')
    .replace(/[^a-z\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((t) => t.length > 1);
}

// Compare a registrant's name (from the register) with the user's signup name.
// Returns 'match' if the surname matches AND at least one given name token matches,
// 'partial' if only one of those matches, 'mismatch' otherwise.
function compareNames(registrant: string, signup: string): 'match' | 'partial' | 'mismatch' {
  const a = tokenizeName(registrant);
  const b = tokenizeName(signup);
  if (a.length === 0 || b.length === 0) return 'mismatch';
  const surnameA = a[a.length - 1];
  const surnameB = b[b.length - 1];
  const surnameMatch = surnameA === surnameB;
  const givenA = new Set(a.slice(0, -1));
  const givenB = new Set(b.slice(0, -1));
  let givenMatch = false;
  for (const t of givenA) if (givenB.has(t)) { givenMatch = true; break; }
  if (surnameMatch && givenMatch) return 'match';
  if (surnameMatch || givenMatch) return 'partial';
  return 'mismatch';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { registration_number, prescriber_type, full_name } = await req.json();

    if (!registration_number || !prescriber_type) {
      return new Response(
        JSON.stringify({ success: false, error: 'Registration number and prescriber type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Verification service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let verified = false;
    let registrantName = '';
    let registrationStatus = '';
    let registerType = '';

    if (prescriber_type === 'gp' || prescriber_type === 'other' || prescriber_type === 'dentist') {
      // GMC verification - scrape the GMC register search results
      const gmcUrl = `https://www.gmc-uk.org/registration-and-licensing/the-medical-register/a-doctor-on-the-register?query=${registration_number}`;
      
      console.log('Scraping GMC register for:', registration_number);
      
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: gmcUrl,
          formats: ['markdown'],
          waitFor: 3000,
        }),
      });

      const data = await response.json();
      const markdown = data?.data?.markdown || data?.markdown || '';

      console.log('GMC scrape result length:', markdown.length);

      // Parse the GMC result - look for registration status
      if (markdown.length > 0) {
        // Check if the page contains registration info (not a "no results" page)
        const hasRegistration = markdown.includes('Registered with a licence to practise') || 
                                markdown.includes('Registered without a licence to practise') ||
                                markdown.includes('Registration status');
        
        if (hasRegistration) {
          verified = markdown.includes('Registered with a licence to practise');
          registrationStatus = verified ? 'Registered with licence' : 'Registered without licence';
          
          // Try to extract the doctor's name from the page
          const nameMatch = markdown.match(/(?:Dr |Doctor )?([A-Z][a-z]+ (?:[A-Z][a-z]+ )*[A-Z][a-z]+)/);
          if (nameMatch) {
            registrantName = nameMatch[1];
          }
          
          registerType = 'GMC';
        }
      }
    } else if (prescriber_type === 'pharmacist') {
      // GPhC verification - scrape the GPhC register
      const gphcUrl = `https://www.pharmacyregulation.org/registers/pharmacist/registrationnumber/${registration_number}`;
      
      console.log('Scraping GPhC register for:', registration_number);
      
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: gphcUrl,
          formats: ['markdown'],
          waitFor: 3000,
        }),
      });

      const data = await response.json();
      const markdown = data?.data?.markdown || data?.markdown || '';

      console.log('GPhC scrape result length:', markdown.length);
      registerType = 'GPhC';

      if (markdown.length > 0 && !/no results found|0 of 0/i.test(markdown)) {
        // Find the table data row that contains the registration number.
        // Each markdown cell may contain header tooltip text separated by <br>;
        // the actual value is the text after the LAST <br> in the cell.
        const lines = markdown.split('\n');
        const rowLine = lines.find((l: string) =>
          l.includes('|') && l.includes(registration_number) && l.includes('See registration details')
        );

        if (rowLine) {
          const cells = rowLine.split('|').map((c: string) => c.trim()).filter(Boolean);
          const valueOf = (cell: string | undefined) => {
            if (!cell) return '';
            const parts = cell.split('<br>');
            let v = parts[parts.length - 1] || '';
            // remove markdown links entirely, e.g. " [See registration details](url)"
            v = v.replace(/\s*\[[^\]]*\]\([^)]*\)/g, '').trim();
            return v;
          };

          const lastName = valueOf(cells[0]);
          const firstNames = valueOf(cells[1]);
          const status = valueOf(cells[4]) || valueOf(cells[3]);

          if (firstNames || lastName) {
            registrantName = `${firstNames} ${lastName}`.trim();
          }
          registrationStatus = status || 'Registered';
          verified = /registered/i.test(registrationStatus);
        }
      }
    } else if (prescriber_type === 'nurse_prescriber') {
      // NMC - we don't auto-verify nurses, flag for manual review
      return new Response(
        JSON.stringify({ 
          success: true, 
          verified: false, 
          status: 'manual_review',
          message: 'Nurse prescriber registration will be manually verified. Please upload your NMC registration certificate.',
          register_type: 'NMC'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If verified, update the prescriber record
    // Compute name similarity (if a signup name was provided)
    let nameSimilarity: 'match' | 'partial' | 'mismatch' | 'unknown' = 'unknown';
    if (registrantName && full_name) {
      nameSimilarity = compareNames(registrantName, full_name);
    }
    const nameOk = nameSimilarity === 'match' || nameSimilarity === 'partial' || nameSimilarity === 'unknown';

    if (verified && nameOk) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get user from JWT
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);

        if (user) {
          // Update prescriber verification status
          await supabase
            .from('prescribers')
            .update({ verification_status: 'approved' })
            .eq('user_id', user.id);
        }
      }
    }

    let message: string;
    if (!verified) {
      message = `Could not verify registration number ${registration_number} on the ${registerType || 'relevant'} register. Please double-check the number — it's easy to mistype it. You can re-enter the number and try again, or continue and upload documents for manual review.`;
    } else if (nameSimilarity === 'mismatch') {
      message = `Registration number ${registration_number} was found on the ${registerType} register, but the name on the register (${registrantName}) does not match the name you signed up with (${full_name}). Please check you entered the correct ${registerType} number — it's easy to mix up similar numbers. If the number is correct, please contact support.`;
    } else {
      message = `Successfully verified on ${registerType} register${registrantName ? ` as ${registrantName}` : ''}.`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: verified && nameSimilarity !== 'mismatch',
        raw_verified: verified,
        name_match: nameSimilarity === 'match' || nameSimilarity === 'partial',
        name_similarity: nameSimilarity,
        registrant_name: registrantName,
        registration_status: registrationStatus,
        register_type: registerType,
        message,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Verification error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Verification service encountered an error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

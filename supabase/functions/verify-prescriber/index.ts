const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      // GMC verification - direct registrant profile URL
      const gmcUrl = `https://www.gmc-uk.org/registrants/${registration_number}`;
      
      console.log('Scraping GMC registrant profile:', gmcUrl);
      
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
      console.log('GMC scrape preview:', markdown.substring(0, 500));

      if (markdown.length > 0) {
        const is404 = markdown.includes("can't find the page") || 
                      markdown.includes('Page not found') ||
                      markdown.includes('Sorry, we can');
        
        if (!is404) {
          const hasLicence = markdown.includes('Registered with a licence to practise');
          const hasRegistrationWithout = markdown.includes('Registered without a licence to practise');
          
          if (hasLicence || hasRegistrationWithout) {
            verified = hasLicence;
            registrationStatus = hasLicence ? 'Registered with licence' : 'Registered without licence';
            registerType = 'GMC';
            
            // Extract the doctor's name - it appears as a heading like "# Adam David JONES"
            const nameMatch = markdown.match(/^#\s+([A-Za-z][A-Za-z'-]+(?: [A-Za-z][A-Za-z'-]+)+)\s*$/m);
            if (nameMatch) {
              registrantName = nameMatch[1];
            }
          }
        }
      }
    } else if (prescriber_type === 'pharmacist') {
      // GPhC verification
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

      if (markdown.length > 0) {
        const hasRegistration = markdown.includes('Registration number') || 
                                markdown.includes('Registered') ||
                                markdown.includes('Status');
        
        if (hasRegistration && !markdown.includes('No results found') && !markdown.includes('not found')) {
          verified = true;
          registrationStatus = 'Registered';
          registerType = 'GPhC';
          
          const nameMatch = markdown.match(/(?:Name|Registrant)[:\s]*([^\n]+)/i);
          if (nameMatch) {
            registrantName = nameMatch[1].trim();
          }
        }
      }
    } else if (prescriber_type === 'nurse_prescriber') {
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
    if (verified) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);

        if (user) {
          await supabase
            .from('prescribers')
            .update({ verification_status: 'approved' })
            .eq('user_id', user.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified,
        registrant_name: registrantName,
        registration_status: registrationStatus,
        register_type: registerType,
        message: verified 
          ? `Successfully verified on ${registerType} register` 
          : `Could not verify registration number ${registration_number} on the ${registerType || 'relevant'} register. Please check the number and try again, or upload verification documents for manual review.`
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

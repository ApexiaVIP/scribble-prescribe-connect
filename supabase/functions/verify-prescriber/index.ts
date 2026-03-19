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
      // GMC verification - use Firecrawl search to find doctor on GMC register
      console.log('Searching GMC register for:', registration_number);
      
      const response = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `site:gmc-uk.org ${registration_number} registered licence practise`,
          limit: 5,
          scrapeOptions: {
            formats: ['markdown'],
          },
        }),
      });

      const data = await response.json();
      console.log('GMC search response status:', response.status);
      console.log('GMC search results count:', data?.data?.length || 0);
      
      const results = data?.data || [];
      
      for (const result of results) {
        const content = (result.markdown || result.description || '').toLowerCase();
        const title = (result.title || '').toLowerCase();
        const url = result.url || '';
        
        console.log('Checking result:', url, 'title:', title?.substring(0, 100));
        
        // Check if this result is from GMC and contains registration info
        if (url.includes('gmc-uk.org') && 
            (content.includes(String(registration_number)) || title.includes(String(registration_number)))) {
          
          const hasLicence = content.includes('registered with a licence to practise') || 
                             content.includes('registered with a licence');
          const hasRegistration = content.includes('registration status') || 
                                  content.includes('registered') ||
                                  hasLicence;
          
          if (hasRegistration) {
            verified = hasLicence;
            registrationStatus = verified ? 'Registered with licence' : 'Found on register';
            registerType = 'GMC';
            
            // Try to extract name
            const fullContent = result.markdown || '';
            const nameMatch = fullContent.match(/(?:Dr |Doctor )([A-Z][a-zA-Z'-]+(?: [A-Z][a-zA-Z'-]+)+)/);
            if (nameMatch) {
              registrantName = nameMatch[1];
            }
            break;
          }
        }
      }
      
      // Fallback: try scraping the register page with actions if search didn't work
      if (!verified && !registerType) {
        console.log('Search did not find results, trying scrape with actions...');
        
        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: 'https://www.gmc-uk.org/registration-and-licensing/our-registers',
            formats: ['markdown'],
            waitFor: 2000,
            actions: [
              { type: 'click', selector: '#cookieBannerRejectAllButton' },
              { type: 'wait', milliseconds: 1000 },
              { type: 'write', selector: '#searchForRegistrant', text: String(registration_number) },
              { type: 'wait', milliseconds: 500 },
              { type: 'click', selector: '#basicRegistrantSearchButton' },
              { type: 'wait', milliseconds: 8000 },
              { type: 'screenshot' },
            ],
          }),
        });

        const scrapeData = await scrapeResponse.json();
        const markdown = scrapeData?.data?.markdown || scrapeData?.markdown || '';
        
        console.log('GMC scrape fallback result length:', markdown.length);
        console.log('GMC scrape fallback preview:', markdown.substring(0, 1000));

        if (markdown.length > 0) {
          const is404 = markdown.includes("can't find the page") || markdown.includes('404');
          const hasRegistration = markdown.includes('Registered with a licence to practise') || 
                                  markdown.includes('Registered without a licence to practise') ||
                                  markdown.includes('Registration status') ||
                                  (markdown.includes(String(registration_number)) && markdown.includes('egister'));
          
          if (hasRegistration && !is404) {
            verified = markdown.includes('Registered with a licence to practise') || 
                       markdown.includes('registered with a licence');
            registrationStatus = verified ? 'Registered with licence' : 'Found on register';
            
            const nameMatch = markdown.match(/(?:Dr |Doctor )([A-Z][a-zA-Z'-]+(?: [A-Z][a-zA-Z'-]+)+)/);
            if (nameMatch) {
              registrantName = nameMatch[1];
            }
            registerType = 'GMC';
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

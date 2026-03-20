const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
};

const GMC_STATUS_WITH_LICENCE = 'registered with a licence to practise';

async function scrapeWithFirecrawl(url: string, apiKey: string, options?: { actions?: unknown[]; waitFor?: number }) {
  const body: Record<string, unknown> = {
    url,
    formats: ['markdown'],
    waitFor: options?.waitFor ?? 3000,
  };
  if (options?.actions) {
    body.actions = options.actions;
  }

  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Firecrawl error:', JSON.stringify(data));
    throw new Error(data?.error || `Firecrawl request failed with status ${response.status}`);
  }

  return data?.data?.markdown || data?.markdown || '';
}

async function verifyGmcRegistration(registrationNumber: string, apiKey: string) {
  const gmcUrl = `https://www.gmc-uk.org/registration-and-licensing/the-medical-register`;

  console.log('Scraping GMC register via Firecrawl for:', registrationNumber);

  try {
    // Use Firecrawl actions to fill in search and click
    const markdown = await scrapeWithFirecrawl(gmcUrl, apiKey, {
      waitFor: 5000,
      actions: [
        { type: 'wait', milliseconds: 2000 },
        { type: 'click', selector: '#cookieBannerRejectAllButton' },
        { type: 'wait', milliseconds: 500 },
        { type: 'write', selector: '#searchForRegistrant', text: registrationNumber },
        { type: 'click', selector: '#basicRegistrantSearchButton' },
        { type: 'wait', milliseconds: 5000 },
      ],
    });

    console.log('GMC scrape result length:', markdown.length);
    console.log('GMC scrape preview:', markdown.substring(0, 1000));

    if (!markdown || markdown.length === 0) {
      return { verified: false, registrantName: '', registrationStatus: '', registerType: 'GMC' };
    }

    // Check if the registration number appears in the results
    if (!markdown.includes(registrationNumber)) {
      console.log('Registration number not found in scrape results');
      return { verified: false, registrantName: '', registrationStatus: '', registerType: 'GMC' };
    }

    // Check for the licence status
    const lowerMarkdown = markdown.toLowerCase();
    const hasLicence = lowerMarkdown.includes(GMC_STATUS_WITH_LICENCE);

    // Try to extract name
    let registrantName = '';
    const namePatterns = [
      /#+\s*(?:Dr\.?\s+)?([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)/m,
      /\*\*(?:Dr\.?\s+)?([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)\*\*/,
      /Name[:\s]*([^\n|]+)/i,
    ];

    for (const pattern of namePatterns) {
      const match = markdown.match(pattern);
      if (match) {
        registrantName = match[1].trim();
        break;
      }
    }

    const registrationStatus = hasLicence ? 'Registered with a licence to practise' : 'Not verified';

    return {
      verified: hasLicence,
      registrantName,
      registrationStatus,
      registerType: 'GMC',
    };
  } catch (error) {
    console.error('GMC Firecrawl scrape error:', error);
    return { verified: false, registrantName: '', registrationStatus: '', registerType: 'GMC' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { registration_number, prescriber_type } = await req.json();

    if (!registration_number || !prescriber_type) {
      return new Response(
        JSON.stringify({ success: false, error: 'Registration number and prescriber type are required' }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Verification service not configured' }),
        { status: 500, headers: jsonHeaders },
      );
    }

    let verified = false;
    let registrantName = '';
    let registrationStatus = '';
    let registerType = '';

    if (prescriber_type === 'gp' || prescriber_type === 'other' || prescriber_type === 'dentist') {
      const gmcResult = await verifyGmcRegistration(registration_number, apiKey);
      verified = gmcResult.verified;
      registrantName = gmcResult.registrantName;
      registrationStatus = gmcResult.registrationStatus;
      registerType = gmcResult.registerType;
    } else if (prescriber_type === 'pharmacist') {
      const gphcUrl = `https://www.pharmacyregulation.org/registers/pharmacist/registrationnumber/${registration_number}`;
      console.log('Scraping GPhC register for:', registration_number);

      const markdown = await scrapeWithFirecrawl(gphcUrl, apiKey);
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
          register_type: 'NMC',
        }),
        { headers: jsonHeaders },
      );
    }

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
          : `Could not verify registration number ${registration_number} on the ${registerType || 'relevant'} register. Please check the number and try again, or upload verification documents for manual review.`,
      }),
      { headers: jsonHeaders },
    );
  } catch (error) {
    console.error('Verification error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Verification service encountered an error' }),
      { status: 500, headers: jsonHeaders },
    );
  }
});

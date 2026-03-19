const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
};

const GMC_STATUS_WITH_LICENCE = 'Registered with a licence to practise';
const GMC_STATUS_WITHOUT_LICENCE = 'Registered without a licence to practise';
const GMC_STATUS_PROVISIONAL = 'Provisionally registered with a licence to practise';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function htmlToText(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractGmcRegistrantName(html: string) {
  const nameMatch = html.match(/<h1>(.*?)<\/h1>/i);
  return nameMatch ? htmlToText(nameMatch[1]) : '';
}

function extractGmcCurrentStatus(html: string, registrationNumber: string) {
  const presentStatusMatch = html.match(
    /<tr>\s*<td>[^<]*<\/td>\s*<td>\s*Present\s*<\/td>\s*<td>(.*?)<\/td>\s*<\/tr>/is,
  );

  if (presentStatusMatch) {
    return htmlToText(presentStatusMatch[1]);
  }

  const text = htmlToText(html);
  const escapedRegistrationNumber = escapeRegExp(registrationNumber);
  const summaryStatusMatch = text.match(
    new RegExp(
      `GMC reference number:\\s*${escapedRegistrationNumber}\\s*(${GMC_STATUS_WITH_LICENCE}|${GMC_STATUS_WITHOUT_LICENCE}|${GMC_STATUS_PROVISIONAL})`,
      'i',
    ),
  );

  return summaryStatusMatch?.[1] ?? '';
}

async function verifyGmcRegistration(registrationNumber: string) {
  const gmcUrl = `https://www.gmc-uk.org/api/gmc/print/registrant?no=${encodeURIComponent(registrationNumber)}`;

  console.log('Fetching GMC print profile:', gmcUrl);

  const response = await fetch(gmcUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    console.error('GMC profile request failed:', response.status);
    return {
      verified: false,
      registrantName: '',
      registrationStatus: '',
      registerType: 'GMC',
    };
  }

  const html = await response.text();
  console.log('GMC HTML length:', html.length);

  const text = htmlToText(html);
  const escapedRegistrationNumber = escapeRegExp(registrationNumber);
  const hasReference = new RegExp(`GMC reference number:\\s*${escapedRegistrationNumber}\\b`, 'i').test(text);

  if (!hasReference) {
    return {
      verified: false,
      registrantName: '',
      registrationStatus: '',
      registerType: 'GMC',
    };
  }

  const registrationStatus = extractGmcCurrentStatus(html, registrationNumber);
  const registrantName = extractGmcRegistrantName(html);
  const verified = registrationStatus.toLowerCase() === GMC_STATUS_WITH_LICENCE.toLowerCase();

  return {
    verified,
    registrantName,
    registrationStatus,
    registerType: 'GMC',
  };
}

async function scrapeWithFirecrawl(url: string, apiKey: string) {
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      waitFor: 3000,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || `Firecrawl request failed with status ${response.status}`);
  }

  return data?.data?.markdown || data?.markdown || '';
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

    let verified = false;
    let registrantName = '';
    let registrationStatus = '';
    let registerType = '';

    if (prescriber_type === 'gp' || prescriber_type === 'other' || prescriber_type === 'dentist') {
      const gmcResult = await verifyGmcRegistration(registration_number);
      verified = gmcResult.verified;
      registrantName = gmcResult.registrantName;
      registrationStatus = gmcResult.registrationStatus;
      registerType = gmcResult.registerType;
    } else if (prescriber_type === 'pharmacist') {
      const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
      if (!apiKey) {
        return new Response(
          JSON.stringify({ success: false, error: 'Verification service not configured' }),
          { status: 500, headers: jsonHeaders },
        );
      }

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
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { image_base64, file_name, prescriber_name } = await req.json();

    if (!image_base64) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine mime type from base64 header or default to jpeg
    let mimeType = 'image/jpeg';
    let cleanBase64 = image_base64;
    if (image_base64.startsWith('data:')) {
      const match = image_base64.match(/^data:(image\/\w+);base64,/);
      if (match) {
        mimeType = match[1];
        cleanBase64 = image_base64.replace(/^data:image\/\w+;base64,/, '');
      }
    }

    console.log('Analyzing ID document for user:', user.id);

    // Use Lovable AI with vision to analyze the document
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an ID document verification assistant for Scribify, a UK prescriber marketplace. Your job is to analyze uploaded ID documents and determine if they are valid UK-issued photo identification.

Valid UK photo ID types:
- UK Passport (current or expired within 2 years)
- UK Driving Licence (full or provisional, photocard)
- UK Biometric Residence Permit (BRP)
- EU/EEA National Identity Card
- Armed Forces ID Card

You must check:
1. Is this a real photo ID document (not a screenshot of a screen, not a random photo)?
2. Is it one of the accepted UK ID types listed above?
3. Is the document reasonably clear and legible?
4. Does it appear genuine (not obviously edited or tampered with)?

${prescriber_name ? `The prescriber's registered name is: ${prescriber_name}. Check if the name on the ID reasonably matches.` : ''}

You MUST use the verify_id_result tool to return your analysis.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this ID document and verify it meets the requirements.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${cleanBase64}`,
                },
              },
            ],
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'verify_id_result',
              description: 'Return the ID verification analysis result',
              parameters: {
                type: 'object',
                properties: {
                  is_valid_id: {
                    type: 'boolean',
                    description: 'Whether the document is a valid accepted photo ID',
                  },
                  document_type: {
                    type: 'string',
                    enum: ['uk_passport', 'uk_driving_licence', 'biometric_residence_permit', 'eu_id_card', 'armed_forces_id', 'unknown'],
                    description: 'The type of ID document detected',
                  },
                  name_on_document: {
                    type: 'string',
                    description: 'The name visible on the ID document, or empty if not readable',
                  },
                  name_matches: {
                    type: 'boolean',
                    description: 'Whether the name on the ID reasonably matches the prescriber name',
                  },
                  is_legible: {
                    type: 'boolean',
                    description: 'Whether the document image is clear enough to read',
                  },
                  confidence: {
                    type: 'string',
                    enum: ['high', 'medium', 'low'],
                    description: 'Confidence level in the verification result',
                  },
                  issues: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of any issues found with the document',
                  },
                  summary: {
                    type: 'string',
                    description: 'A brief human-readable summary of the verification result',
                  },
                },
                required: ['is_valid_id', 'document_type', 'name_on_document', 'name_matches', 'is_legible', 'confidence', 'issues', 'summary'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'verify_id_result' } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: 'Verification service is busy. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: 'Verification service temporarily unavailable.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errText = await aiResponse.text();
      console.error('AI gateway error:', status, errText);
      return new Response(
        JSON.stringify({ error: 'AI verification failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      console.error('No tool call in AI response:', JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: 'AI did not return a structured result' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log('ID verification result:', JSON.stringify(result));

    // Upload the document to storage for record-keeping
    const fileExt = mimeType.split('/')[1] || 'jpg';
    const storagePath = `${user.id}/id-document-${Date.now()}.${fileExt}`;
    const fileBytes = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0));

    const { error: uploadError } = await supabase.storage
      .from('verification-documents')
      .upload(storagePath, fileBytes, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      // Don't fail the whole request over storage, just log it
    }

    return new Response(
      JSON.stringify({
        ...result,
        stored: !uploadError,
        storage_path: uploadError ? null : storagePath,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('verify-id-document error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

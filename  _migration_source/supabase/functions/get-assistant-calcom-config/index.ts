import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assistantId } = await req.json();

    if (!assistantId) {
      return new Response(JSON.stringify({ error: 'Assistant ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get assistant's tools config
    console.log(`Fetching tools config for assistant: ${assistantId}`);
    
    // Check if assistantId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(assistantId)) {
      console.error('Invalid UUID format:', assistantId);
      return new Response(JSON.stringify({ 
        error: 'Invalid assistant ID format',
        details: 'Assistant ID must be a valid UUID'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { data: assistant, error } = await supabase
      .from('assistants')
      .select('tools_config')
      .eq('id', assistantId)
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(JSON.stringify({ 
        error: 'Assistant not found',
        details: error.message 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const toolsConfig = assistant.tools_config || {};
    const calcomConfig = toolsConfig.calcom || null;

    console.log('Retrieved Cal.com config:', calcomConfig ? 'Found' : 'Not configured');

    return new Response(JSON.stringify({ 
      success: true,
      calcomConfig: calcomConfig
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-assistant-calcom-config function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to retrieve configuration',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalcomConfig {
  apiKey: string;
  eventId: string;
  calendarName: string;
  permissions: 'view_only' | 'view_and_book';
  confirmationType: 'sms' | 'email';
  enabled: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assistantId, calcomConfig } = await req.json();

    if (!assistantId) {
      return new Response(JSON.stringify({ error: 'Assistant ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!calcomConfig) {
      return new Response(JSON.stringify({ error: 'Cal.com configuration is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get current tools config
    console.log(`Updating tools config for assistant: ${assistantId}`);
    
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
    
    const { data: assistant, error: fetchError } = await supabase
      .from('assistants')
      .select('tools_config')
      .eq('id', assistantId)
      .single();

    if (fetchError) {
      console.error('Database fetch error:', fetchError);
      return new Response(JSON.stringify({ 
        error: 'Assistant not found',
        details: fetchError.message 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update tools config with Cal.com configuration
    const updatedToolsConfig = {
      ...(assistant.tools_config || {}),
      calcom: calcomConfig
    };

    const { error: updateError } = await supabase
      .from('assistants')
      .update({ tools_config: updatedToolsConfig })
      .eq('id', assistantId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return new Response(JSON.stringify({ 
        error: 'Failed to save configuration',
        details: updateError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Cal.com config saved successfully');

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Cal.com configuration saved successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in save-assistant-calcom-config function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to save configuration',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { apiKey, eventId } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build headers for different API versions (align with LiveKit sample)
    const headersLegacy = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'cal-api-version': '2024-06-14',
    };
    const headersModern = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'cal-api-version': '2024-08-13',
    };

    // Test /me endpoint to validate API key
    console.log('Testing Cal.com API connection...');
    const meResponse = await fetch('https://api.cal.com/v2/me', {
      method: 'GET',
      headers: headersLegacy, // LiveKit uses 2024-06-14 for /me
    });

    if (!meResponse.ok) {
      console.error('Cal.com API error:', await meResponse.text());
      return new Response(JSON.stringify({ 
        error: 'Invalid Cal.com API key',
        details: 'Unable to authenticate with Cal.com'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userData = await meResponse.json();
    console.log('Cal.com user data:', userData);

    let eventTypeData = null;
    
    // If eventId is provided, validate it (robust LiveKit-style)
    if (eventId) {
      const trimmedId = String(eventId).trim();
      console.log(`Validating event type ID (listing): ${trimmedId}`);

      // Ensure numeric ID
      const numericId = Number(trimmedId);
      if (!Number.isFinite(numericId)) {
        return new Response(JSON.stringify({ 
          error: 'Invalid Event ID format',
          details: 'Event ID must be a numeric value as shown in Cal.com URL (e.g., https://app.cal.com/event-types/3231593)'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch username from /me response
      const username = userData?.data?.username;
      if (!username) {
        console.error('Username not found in /me response:', userData);
        return new Response(JSON.stringify({ 
          error: 'Failed to resolve username',
          details: 'Could not determine Cal.com username from API key'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // List event types for this username and find the one by ID
      const listUrl = `https://api.cal.com/v2/event-types/?username=${encodeURIComponent(username)}`;
      const listResponse = await fetch(listUrl, {
        method: 'GET',
        headers: headersLegacy, // LiveKit uses 2024-06-14 for event-types listing
      });

      console.log(`Event types list status: ${listResponse.status}`);
      if (!listResponse.ok) {
        const errorText = await listResponse.text();
        console.error('Event types listing error:', errorText);
        return new Response(JSON.stringify({ 
          error: 'Failed to list event types',
          details: `Unable to list event types for user ${username}. Status: ${listResponse.status}`
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const listData = await listResponse.json();
      const events = Array.isArray(listData?.data) ? listData.data : [];
      const matched = events.find((e: any) => e && Number(e.id) === numericId);

      if (!matched) {
        return new Response(JSON.stringify({ 
          error: 'Invalid Event ID',
          details: `Event ID ${numericId} not found for user ${username}. Make sure the Event Type exists and your API key has access to it.`
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      eventTypeData = matched;
      console.log('Matched event type:', eventTypeData);
    } else {
      console.log('No Event ID provided, testing API key authentication only');
    }

    // Build a normalized eventType summary regardless of response shape
    const normalizeEvent = (evt: any) => {
      const d = evt?.data ?? evt;
      if (!d) return null;
      return {
        id: d.id,
        title: d.title,
        slug: d.slug,
        length: d.length ?? d.lengthInMinutes
      };
    };

    return new Response(JSON.stringify({ 
      success: true,
      message: eventTypeData ? 'API key and Event ID validated successfully' : 'API key validated successfully',
      user: {
        id: userData.data?.id,
        username: userData.data?.username,
        email: userData.data?.email,
        name: userData.data?.name
      },
      eventType: eventTypeData ? normalizeEvent(eventTypeData) : null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in test-calcom-connection function:', error);
    return new Response(JSON.stringify({ 
      error: 'Connection test failed',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

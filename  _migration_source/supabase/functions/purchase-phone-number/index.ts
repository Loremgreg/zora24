import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};

// Helper function for retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, assistantId } = await req.json();

    // Validation des inputs
    if (!phoneNumber || !assistantId) {
      throw new Error('phoneNumber and assistantId are required');
    }

    // Idempotency key pour éviter les doubles achats
    const idempotencyKey = req.headers.get('idempotency-key') ||
      `purchase-${assistantId}-${phoneNumber.replace(/[^0-9]/g, '')}`;

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!twilioAccountSid || !twilioAuthToken) {
      throw new Error('Twilio credentials not configured');
    }

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Vérifier si ce numéro n'a pas déjà été acheté (idempotence)
    const { data: existingNumber } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('e164', phoneNumber)
      .eq('assistant_id', assistantId)
      .single();

    if (existingNumber) {
      console.log('Phone number already purchased (idempotent):', existingNumber);
      return new Response(
        JSON.stringify({
          success: true,
          phoneNumber: existingNumber,
          twilioSid: existingNumber.twilio_sid,
          idempotent: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Purchase the phone number from Twilio avec retry
    const purchaseData = await retryWithBackoff(async () => {
      const purchaseResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            PhoneNumber: phoneNumber,
          }),
        }
      );

      if (!purchaseResponse.ok) {
        const error = await purchaseResponse.json();
        throw new Error(`Twilio API error: ${error.message || purchaseResponse.statusText}`);
      }

      return await purchaseResponse.json();
    });

    console.log('Phone number purchased successfully:', purchaseData);

    // Store the purchased number in our database
    const { data: insertData, error: insertError } = await supabase
      .from('phone_numbers')
      .insert({
        e164: phoneNumber,
        country: 'US', // Could be extracted from phone number format
        twilio_sid: purchaseData.sid,
        assistant_id: assistantId,
        monthly_cost: 1.0, // Default cost
        status: 'active',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing phone number:', insertError);

      // Si l'insertion échoue, essayer de libérer le numéro Twilio
      try {
        await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers/${purchaseData.sid}.json`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
            },
          }
        );
        console.log('Twilio number released due to DB error');
      } catch (releaseError) {
        console.error('Failed to release Twilio number:', releaseError);
      }

      throw new Error('Failed to store purchased number in database');
    }

    console.log('Phone number stored in database:', insertData);

    return new Response(
      JSON.stringify({
        success: true,
        phoneNumber: insertData,
        twilioSid: purchaseData.sid,
        idempotencyKey
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error purchasing phone number:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

console.log("create-twilio-subaccount function initialized (v3 - DB Save)");

const TWILIO_API_URL = "https://api.twilio.com/2010-04-01/Accounts.json";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Get parameters from request body
    const { friendlyName, assistant_id } = await req.json();
    if (!friendlyName || !assistant_id) {
      throw new Error("Missing required parameter(s): friendlyName, assistant_id");
    }

    // 2. Create Twilio Subaccount (same as before)
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    if (!accountSid || !authToken) {
      throw new Error("Twilio master credentials are not set.");
    }

    const credentials = btoa(`${accountSid}:${authToken}`);
    const twilioResponse = await fetch(TWILIO_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ FriendlyName: friendlyName }).toString(),
    });

    const twilioData = await twilioResponse.json();
    if (!twilioResponse.ok) {
      throw new Error(twilioData.message || "Twilio API request failed");
    }
    console.log(`Subaccount created: ${twilioData.sid}`);

    const subaccountCredentials = {
      accountSid: twilioData.sid,
      authToken: twilioData.auth_token,
    };

    // 3. Save credentials to Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("APP_SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("APP_SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // TODO: Encrypt subaccountCredentials.authToken before saving
    const { error: dbError } = await supabaseClient
      .from("assistants")
      .update({
        twilio_account_sid: subaccountCredentials.accountSid,
        twilio_auth_token: subaccountCredentials.authToken, // Stored in plaintext for now
      })
      .eq("id", assistant_id);

    if (dbError) {
      // Note: In a real scenario, you might want to handle this failure,
      // e.g., by trying to delete the created Twilio subaccount to avoid orphans.
      throw new Error(`Database error: ${dbError.message}`);
    }
    console.log(`Credentials saved to assistant ${assistant_id}`);

    // 4. Return credentials to the client
    return new Response(JSON.stringify(subaccountCredentials), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in create-twilio-subaccount:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
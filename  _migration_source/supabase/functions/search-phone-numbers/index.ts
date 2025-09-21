import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

console.log("search-phone-numbers function initialized (v3 - normalized inputs + structured response)");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1) Parse and normalize inputs
    const raw = await req.json();
    console.log("Received request body:", JSON.stringify(raw));

    const assistant_id = raw?.assistant_id ?? raw?.assistantId;
    let country_code = raw?.country_code ?? raw?.country;
    const area_code = raw?.area_code ?? raw?.areaCode;

    if (typeof country_code === "string") {
      country_code = country_code.trim().toUpperCase();
    }

    if (!assistant_id || !country_code) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter(s): assistant_id, country_code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2) Use Master Account credentials for AvailablePhoneNumbers (subaccounts don't have access)
    const masterSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const masterAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    if (!masterSid || !masterAuthToken) {
      throw new Error("Master Twilio credentials not configured");
    }

    // 3) Call Twilio API with Master credentials
    const subaccountSid = masterSid;
    const subaccountAuthToken = masterAuthToken;

    const searchParams = new URLSearchParams();
    if (area_code) searchParams.set("AreaCode", String(area_code));

    const qs = searchParams.toString();
    const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(subaccountSid)}/AvailablePhoneNumbers/${encodeURIComponent(country_code)}/Local.json${qs ? `?${qs}` : ""}`;
    console.log("Twilio request:", { country_code, area_code: area_code ?? null, url: twilioApiUrl });

    const credentials = btoa(`${subaccountSid}:${subaccountAuthToken}`);
    const twilioResponse = await fetch(twilioApiUrl, {
      method: "GET",
      headers: { Authorization: `Basic ${credentials}` },
    });

    // 4) Handle Twilio API response
    const twilioData = await twilioResponse.json();
    if (!twilioResponse.ok) {
      const message = twilioData?.message || twilioData?.error || "Twilio API request failed";
      return new Response(JSON.stringify({ error: message }), {
        status: twilioResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5) Normalize Twilio payload to UI-friendly shape
    const availableNumbers = (twilioData?.available_phone_numbers ?? []).map((n: any) => ({
      id: n.phone_number,
      number: n.phone_number,
      friendlyName: n.friendly_name ?? undefined,
      locality: n.locality ?? undefined,
      region: n.region ?? undefined,
      country: n.iso_country ?? country_code,
      price: 1.0,
      capabilities: n.capabilities ?? undefined,
    }));

    return new Response(JSON.stringify({ numbers: availableNumbers }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error in search-phone-numbers:", error?.message || error);
    return new Response(JSON.stringify({ error: error?.message || "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});


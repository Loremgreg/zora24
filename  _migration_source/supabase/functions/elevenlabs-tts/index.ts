import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { voiceId, text, model = "eleven_flash_v2_5" } = await req.json();

    // Validate input
    if (!voiceId || !text?.trim()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: voiceId ? "Le texte ne peut pas être vide" : "Voice ID manquant" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) {
      console.error('ELEVENLABS_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Clé API ElevenLabs non configurée" 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Generating audio for voice ${voiceId} with model ${model}`);
    console.log(`Request payload:`, JSON.stringify({
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      model_id: model,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
        style: 0.0,
        use_speaker_boost: true
      }
    }));

    // Call ElevenLabs API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0.0,
          use_speaker_boost: true
        }
      }),
    });

    if (!response.ok) {
      let errorMessage = "Erreur lors de la génération audio";
      let responseText = "";
      
      try {
        responseText = await response.text();
        console.error(`ElevenLabs API full response: ${responseText}`);
      } catch (e) {
        console.error('Could not read response text:', e);
      }
      
      if (response.status === 401) {
        errorMessage = "Clé API ElevenLabs invalide";
      } else if (response.status === 422) {
        errorMessage = "Quota ElevenLabs dépassé ou voix indisponible";
      } else if (response.status === 429) {
        errorMessage = "Limite de taux ElevenLabs atteinte";
      } else if (response.status === 400) {
        errorMessage = `Requête invalide: ${responseText}`;
      }

      console.error(`ElevenLabs API error: ${response.status} - ${errorMessage}`);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    
    console.log(`Audio generated successfully, size: ${audioBuffer.byteLength} bytes`);

    // Return audio as base64 to work with the existing frontend interface
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

    return new Response(
      JSON.stringify({ 
        success: true, 
        audio: base64Audio,
        contentType: 'audio/mpeg'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Erreur de connexion à ElevenLabs" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
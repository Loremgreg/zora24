import { supabase } from "@/integrations/supabase/client";

export interface ElevenLabsResponse {
  audio: Blob;
  success: boolean;
  error?: string;
}

export async function generateAudio(
  voiceId: string,
  text: string,
  model: string = "eleven_flash_v2_5"
): Promise<ElevenLabsResponse> {
  console.log('[DEBUG] generateAudio called with:', { voiceId, textLength: text.length, model });

  if (!text.trim()) {
    console.log('[DEBUG] Empty text provided');
    return {
      audio: new Blob(),
      success: false,
      error: "Le texte ne peut pas être vide"
    };
  }

  try {
    console.log('[DEBUG] Invoking Supabase function elevenlabs-tts for voice:', voiceId);
    const startTime = Date.now();

    const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
      body: { voiceId, text, model }
    });

    const endTime = Date.now();
    console.log('[DEBUG] Supabase function call took:', endTime - startTime, 'ms');

    if (error) {
      console.error('[DEBUG] Supabase function error for voice', voiceId, ':', error);
      return {
        audio: new Blob(),
        success: false,
        error: `Erreur de connexion au service audio: ${error.message || 'Erreur inconnue'}`
      };
    }

    console.log('[DEBUG] Supabase function response for voice', voiceId, ':', {
      success: data?.success,
      hasAudio: !!data?.audio,
      error: data?.error
    });

    if (!data.success) {
      console.log('[DEBUG] ElevenLabs API returned error for voice', voiceId, ':', data.error);
      return {
        audio: new Blob(),
        success: false,
        error: data.error || "Erreur lors de la génération audio"
      };
    }

    // Convert base64 back to blob
    console.log('[DEBUG] Converting base64 to blob for voice', voiceId, ', audio length:', data.audio?.length);
    const audioData = atob(data.audio);
    const audioArray = new Uint8Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      audioArray[i] = audioData.charCodeAt(i);
    }
    const audioBlob = new Blob([audioArray], { type: 'audio/mpeg' });

    console.log('[DEBUG] Audio blob created for voice', voiceId, ', size:', audioBlob.size);

    return {
      audio: audioBlob,
      success: true
    };
  } catch (error: any) {
    console.error('[DEBUG] Generate audio error for voice', voiceId, ':', error);
    return {
      audio: new Blob(),
      success: false,
      error: `Erreur de connexion au service audio: ${error.message || 'Erreur inconnue'}`
    };
  }
}

export async function playAudio(audioBlob: Blob): Promise<void> {
  console.log('[DEBUG] playAudio called, blob size:', audioBlob.size, 'type:', audioBlob.type);

  // Ensure audio context is active (required by some browsers)
  try {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        console.log('[DEBUG] Resuming suspended audio context');
        await audioContext.resume();
      }
    }
  } catch (contextError) {
    console.warn('[DEBUG] Audio context handling failed:', contextError);
  }

  return new Promise((resolve, reject) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    console.log('[DEBUG] Created audio URL:', audioUrl);

    const audio = new Audio(audioUrl);

    audio.onended = () => {
      console.log('[DEBUG] Audio playback ended successfully');
      URL.revokeObjectURL(audioUrl);
      resolve();
    };

    audio.onerror = (e) => {
      console.error('[DEBUG] Audio playback error:', e);
      URL.revokeObjectURL(audioUrl);
      reject(new Error("Erreur lors de la lecture audio"));
    };

    audio.oncanplay = () => {
      console.log('[DEBUG] Audio can play, starting playback');
    };

    audio.onloadeddata = () => {
      console.log('[DEBUG] Audio data loaded, duration:', audio.duration);
    };

    console.log('[DEBUG] Attempting to play audio');
    audio.play().catch((playError) => {
      console.error('[DEBUG] Audio play failed:', playError);

      // Handle specific browser permission errors
      if (playError.name === 'NotAllowedError') {
        reject(new Error("Permission audio refusée. Cliquez sur le bouton pour autoriser la lecture audio."));
      } else if (playError.name === 'NotSupportedError') {
        reject(new Error("Format audio non supporté par votre navigateur."));
      } else {
        reject(new Error(`Erreur de lecture audio: ${playError.message}`));
      }
    });
  });
}

// Cache simple pour éviter les appels redondants
const audioCache = new Map<string, Blob>();

export async function generateAndPlayAudio(
  voiceId: string,
  text: string,
  useCache: boolean = true
): Promise<ElevenLabsResponse> {
  const cacheKey = `${voiceId}-${text}`;
  console.log('[DEBUG] generateAndPlayAudio called:', { voiceId, textLength: text.length, useCache, cacheKey });

  if (useCache && audioCache.has(cacheKey)) {
    console.log('[DEBUG] Using cached audio for:', cacheKey);
    const cachedAudio = audioCache.get(cacheKey)!;
    await playAudio(cachedAudio);
    return { audio: cachedAudio, success: true };
  }

  console.log('[DEBUG] Generating new audio for voice', voiceId, '(not cached)');
  const result = await generateAudio(voiceId, text);

  if (result.success && result.audio.size > 0) {
    console.log('[DEBUG] Audio generation successful for voice', voiceId, ', playing audio');
    if (useCache) {
      audioCache.set(cacheKey, result.audio);
      console.log('[DEBUG] Audio cached for voice', voiceId);
    }
    await playAudio(result.audio);
  } else {
    console.log('[DEBUG] Audio generation failed for voice', voiceId, ':', result.error);
  }

  return result;
}

// Fonction de diagnostic pour tester une voix spécifique
export async function testVoiceConnectivity(voiceId: string): Promise<{ available: boolean, error?: string }> {
  console.log('[DEBUG] Testing voice connectivity for:', voiceId);

  try {
    const testText = "Test";
    const result = await generateAudio(voiceId, testText);

    if (result.success) {
      console.log('[DEBUG] Voice', voiceId, 'is available');
      return { available: true };
    } else {
      console.log('[DEBUG] Voice', voiceId, 'is not available:', result.error);
      return { available: false, error: result.error };
    }
  } catch (error: any) {
    console.error('[DEBUG] Voice connectivity test failed for', voiceId, ':', error);
    return { available: false, error: error.message };
  }
}
# Inventaire De Migration — Zora24.ai

Note de cible: cet inventaire vise une migration vers CodeGuide Starter Kit (Next.js 15, Clerk, Supabase, Tailwind v4, shadcn/ui). Il reste valable pour d’autres boilerplates Next + Supabase.

Ce document dresse l’inventaire précis des fichiers à migrer et cartographie leurs dépendances, pour réutiliser le cœur métier (assistants, outils, audio, numéros, agent Python) dans un nouveau boilerplate SaaS.

## 1) UI Assistants (Frontend)

- `src/components/Assistants/AssistantsList.tsx`
  - Lit: tables `assistants`, `phone_numbers` (Supabase)
  - Dépend: `@/integrations/supabase/client`, `CreateAssistantModal`, navigation React Router
  - Sortie: redirection vers l’éditeur d’assistant

- `src/components/Assistants/CreateAssistantModal.tsx`
  - Écrit: `supabase.from('assistants').insert`
  - Invoque: `supabase.functions.invoke('create-twilio-subaccount')`
  - Dépend: Supabase (client anon), Edge Function (service role), Twilio master (via Edge)
  - Sortie: navigation `/assistants/:id`

- `src/components/Assistants/AssistantEditor.tsx`
  - Dépend: `VoiceSelector`, `PromptTemplates`, `NumberManagement`, `ToolsManagement`
  - Lit/Écrit: table `assistants` (nom, `voice_id`, `start_message`, `prompt`)
  - Audio test: `@/services/elevenLabsService`

- `src/components/Assistants/VoiceSelector.tsx`
  - Appelle: `generateAndPlayAudio` → Edge Function `elevenlabs-tts`
  - Sortie: lecture audio (Web Audio API)

- `src/components/Assistants/NumberManagement.tsx`
  - Appelle: `search-phone-numbers`, `purchase-phone-number` (Edge)
  - Lit/Écrit: table `phone_numbers`
  - Envs (via Edge): Twilio master creds, Supabase service role

- `src/components/Assistants/ToolsManagement.tsx`
  - Appelle: `get-assistant-calcom-config`, `save-assistant-calcom-config`, `test-calcom-connection` (Edge)
  - Écrit: `assistants.tools_config` (JSONB)

## 2) Pages & Routing

- `src/pages/Assistants.tsx`, `src/pages/AssistantEdit.tsx`, `src/App.tsx`
  - React Router à traduire vers App Router Next.js

## 3) Services Front

- `src/services/elevenLabsService.ts`
  - Appelle: `supabase.functions.invoke('elevenlabs-tts')`
  - Transforme audio base64 → `Blob`, lecture Web Audio
  - Envs (Edge): `ELEVENLABS_API_KEY`

## 4) Supabase (client + types)

- `src/integrations/supabase/client.ts`
  - Dépend: `@supabase/supabase-js`, `./types`
  - Actuel: URL/KEY hardcodées → à remplacer par env (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

- `src/integrations/supabase/types.ts`
  - Tables: `assistants`, `phone_numbers`, `sip_trunks`; colonnes `tools_config`, `twilio_*`

## 5) Supabase Edge Functions (Deno)

- `supabase/functions/elevenlabs-tts/index.ts`
  - Entrées: `{ voiceId, text, model }` → Sorties: `{ success, audio(base64) }`
  - Envs: `ELEVENLABS_API_KEY`

- `supabase/functions/search-phone-numbers/index.ts`
  - Entrées: `{ assistant_id, country_code, area_code? }` → Sorties: `{ numbers: [...] }`
  - Envs: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`

- `supabase/functions/purchase-phone-number/index.ts`
  - Entrées: `{ phoneNumber, assistantId }` → Twilio purchase → insert `phone_numbers`
  - Envs: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

- `supabase/functions/create-twilio-subaccount/index.ts`
  - Entrées: `{ friendlyName, assistant_id }` → Twilio create subaccount → update `assistants.twilio_*`
  - Envs: Twilio master + Supabase service role

- `supabase/functions/get-assistant-calcom-config/index.ts`
  - Entrées: `{ assistantId }` → Sorties: `{ success, calcomConfig }`
  - Envs: Supabase service role

- `supabase/functions/save-assistant-calcom-config/index.ts`
  - Entrées: `{ assistantId, calcomConfig }` → update `assistants.tools_config`
  - Envs: Supabase service role

- `supabase/functions/test-calcom-connection/index.ts`
  - Entrées: `{ apiKey, eventId? }` → Cal.com `/me` et `/event-types`

- Partagés: `supabase/functions/_shared/cors.ts`, `supabase/config.toml`

## 6) Base de Données (migrations)

- `supabase/migrations/*`
  - Tables: `assistants`, `phone_numbers`, `sip_trunks`
  - RLS: initialement activée, désactivée temporairement (dernière migration) → à réactiver avec Auth
  - Index/Triggers: `update_updated_at_column`

## 7) Agent Python (cœur métier)

- `zora_agent.py`
  - Dépend: `calendar_api`, LiveKit Agents/Plugins (OpenAI, Deepgram, ElevenLabs, Silero), `dotenv`, `supabase` (py)
  - Récupère config Cal.com via Supabase; gère `list_available_slots` et `schedule_appointment`
  - Envs: `LIVEKIT_*`, `OPENAI_API_KEY`, `DEEPGRAM_API_KEY`, `ELEVEN_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, optionnels Langfuse, `CAL_API_KEY`

- `calendar_api.py`
  - Implémente `FakeCalendar` (slots mock) et `CalComCalendar` (Cal.com via `aiohttp`)

- `requirements.txt`, `test_calcom_api.py`, `test_option_b.py`

## 8) Hooks/UI Utiles

- `src/hooks/use-toast.ts`, `src/components/ui/*` (conservables ou remplaçables par DaisyUI)

## 9) Variables d’Environnement (renommer/porter)

- Front (Next): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Clerk n’expose pas le service-role; le token template pour RLS est récupéré côté serveur)
- Edge (Supabase): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ELEVENLABS_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- Agent (Python): `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `OPENAI_API_KEY`, `DEEPGRAM_API_KEY`, `ELEVEN_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CAL_API_KEY?`, Langfuse

## 10) Flux Clés & Dépendances Croisées

- Création assistant → DB insert → Edge `create-twilio-subaccount` (Twilio)
- Test audio → Edge `elevenlabs-tts` → ElevenLabs → lecture Web Audio
- Recherche/Achat numéros → Edge `search-phone-numbers`/`purchase-phone-number` → Twilio → `phone_numbers`
- Outils Cal.com → Edge `get/save-assistant-calcom-config` (+ test) → `assistants.tools_config`
- Agent → lit config via Supabase → Cal.com REST pour slots et bookings

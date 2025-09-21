# Plan De Migration Vers CodeGuide Starter Kit (Clerk + Supabase)

Ce plan adapte la migration de Zora24.ai au boilerplate CodeGuide Starter Kit: Next.js 15 (App Router) + TypeScript, Clerk (auth), Supabase (DB), Tailwind v4, shadcn/ui, avec ajout de Stripe et Resend. Objectif: réutiliser Supabase (migrations, RLS, Edge Functions) et porter l’UI avec un minimum de réécritures.

## 0) Architecture (DB/Auth)

- Base: Supabase (Postgres) pour tout le domaine métier (assistants, numéros, outils) + Edge Functions.
- Auth: Clerk. Pour que Supabase applique la sécurité RLS avec Clerk, utiliser External JWT (guide: `docs/SETUP_CLERK_SUPABASE_RLS.md`).
- Alternative temporaire: proxy server-side (routes Next) avec service-role et vérifs applicatives, en attendant l’External JWT.

## 1) Scaffolding & Envs

- Générer CodeGuide Starter Kit (Next.js 15 App Router, TypeScript, Tailwind v4, shadcn/ui, Clerk, Supabase)
- Ajouter Supabase côté front: `@supabase/supabase-js`
- `.env.local` (Next):
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Clerk: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, etc.
  - `STRIPE_*`, `RESEND_API_KEY`
  - (si External JWT) secret/algorithme du template JWT Clerk pour Supabase

## 2) Intégration Supabase & Types

- Créer `lib/supabase/client.ts` (browser) et `lib/supabase/server.ts` (server)
- Importer `src/integrations/supabase/types.ts`
- Remplacer la config hardcodée de `client.ts` par les env Next `NEXT_PUBLIC_*`
- Vérifier CORS et `supabase.functions.invoke` depuis Next
- Appliquer les migrations `supabase/migrations/*` (DB Supabase)

## 3) 🔒 SÉCURITÉ FIRST - Auth Clerk & RLS

⚠️ **CRITIQUE : Cette étape doit être complétée AVANT tout développement UI**

### 3.1) Auth Clerk Basique
- Configurer Clerk providers et middleware
- Protéger les routes privées (`/assistants/*`)
- Tester login/logout basique

### 3.2) External JWT & RLS
- Créer JWT Template dans Clerk Dashboard (HS256 pour commencer)
- Configurer Supabase pour vérifier le JWT Clerk (JWT secret)
- Mettre en place External JWT (Clerk → Supabase): token Clerk signé (template) vu par Supabase
- Implémenter `createServerSupabase()` avec token template

### 3.3) Policies RLS Complètes
- Adapter les policies RLS pour utiliser `jwt.sub` comparé à `assistants.user_id`
- **AJOUTER policies manquantes pour `phone_numbers`** :
```sql
CREATE POLICY "Users can manage their phone numbers" ON phone_numbers
FOR ALL USING (
  EXISTS (SELECT 1 FROM assistants
          WHERE assistants.id = phone_numbers.assistant_id
          AND auth.jwt_sub() = assistants.user_id::text)
);
```
- **AJOUTER policies pour `sip_trunks`** si nécessaire
- Supprimer l'UUID de dev dans `CreateAssistantModal` et renseigner `user_id` réel

### 3.4) Stratégie de Fallback
- Implémenter proxy server-side temporaire si External JWT échoue
- Routes API Next.js avec service-role + vérification applicative

## 4) Portage UI & Routing (React Router → App Router)

- Pages:
  - `/assistants/page.tsx` → rend `AssistantsList`
  - `/assistants/[id]/page.tsx` → rend `AssistantEditor`
  - Adapter `useNavigate` → `useRouter().push`
- Composants à migrer tels quels:
  - `src/components/Assistants/*` (AssistantsList, CreateAssistantModal, AssistantEditor, VoiceSelector, NumberManagement, ToolsManagement)
  - UI: soit conserver vos primitives existantes, soit adopter shadcn/ui progressivement

## 5) Audio & Tests Voix (ElevenLabs) - Quick Win

- Reprendre `src/services/elevenLabsService.ts` et `VoiceSelector`
- Valider la lecture audio (Web Audio API) et la conversion base64→Blob
- Continuer d'appeler Edge Function `elevenlabs-tts`
- Vérifier sur Supabase: `ELEVENLABS_API_KEY`

## 6) Twilio — Recherche/Achat Numéros (Avec Sécurité Renforcée)

⚠️ **ATTENTION : Étape critique avec améliorations sécurité**

### 6.1) Edge Functions Twilio
- Conserver les Edge Functions `search-phone-numbers`, `purchase-phone-number` et `create-twilio-subaccount`
- Vérifier sur Supabase: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`

### 6.2) Améliorations Sécurité & Robustesse
- **AJOUTER idempotency keys** pour `purchase-phone-number` (éviter double facturation)
- **AJOUTER retry logic** avec backoff exponentiel
- **PLANIFIER chiffrement** `twilio_auth_token` (ne pas stocker en clair)
- **AJOUTER monitoring** coûts Twilio et alertes
- CORS: garder `_shared/cors.ts`

## 7) Cal.com — Outils & Agent Python

- Conserver `assistants.tools_config` (JSONB) via `get/save-assistant-calcom-config`
- Tester via `test-calcom-connection`
- Continuer d'appeler Edge Functions Cal.com
- Agent Python:
  - Déploiement séparé (Railway/Fly/Render). Endpoints HTTP optionnels (health) si besoin
  - Continue de lire la config via Supabase

## 8) Stripe — Gating des fonctionnalités

- Gérer l'accès aux features premium (création assistants, achat de numéros, activation Cal.com)
- Webhooks Stripe → mise à jour d'un état d'abonnement (table DB) et middleware côté Next
- Implémenter gating hybride (DB + middleware)

## 9) Resend — Emails & Notifications

- Configurer Resend pour les emails transactionnels
- Templates d'emails (confirmation, notifications)
- Intégration avec les webhooks Stripe

## 10) (Optionnel) Portage vers Next API Routes — Phase 2

- Cibler en premier `elevenlabs-tts` et `test-calcom-connection`
- Déplacer les secrets vers Vercel env; remplacer les invocations par des fetch vers `/api/...`
- Attention `purchase-phone-number`/Twilio: besoin d'un rôle serveur équivalent au service-role (sécuriser les accès)

## 11) Monitoring & Observabilité

⚠️ **NOUVEAU : Monitoring incrémental dès le début**

- **Healthcheck basique** : Endpoint `/api/health` dès PR1
- **Logs RLS** : Tracer succès/échecs d'authentification (PR3)
- **Monitoring Twilio** : Coûts, erreurs, double-achats (PR6)
- **Agent Python** : Healthcheck + métriques LiveKit (PR7)
- **Dashboard complet** : Supabase Analytics + Vercel Analytics (PR10)

## 12) Renommage ENV — Checklist

- Front:
  - Vite `VITE_*` → Next `NEXT_PUBLIC_*`
- Supabase (Edge):
  - `ELEVENLABS_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`
- Agent (Python):
  - `LIVEKIT_*`, `OPENAI_API_KEY`, `DEEPGRAM_API_KEY`, `ELEVEN_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CAL_API_KEY?`, Langfuse

## 13) QA & Déploiement

- Local:
  - Next dev (`pnpm dev`), Supabase Edge (CLI), Agent Python (`python zora_agent.py start`)
  - **Tester avec sécurité active** : login, création assistant (user_id réel), test audio, recherche/achat numéro, test Cal.com
- Prod:
  - Next sur Vercel; Supabase (DB + Edge); Agent sur worker
  - Configurer: Stripe webhooks, Resend domain, OAuth Google callbacks, **RLS activée dès le début**

## 14) 🔄 NOUVEAU Découpage en PRs (Sécurité First)

⚠️ **ORDRE MODIFIÉ : Sécurité en Phase 2 au lieu de Phase 6**

### **Phase 1 - Fondations (2-3 jours)**
- **PR1**: Scaffold + Env + Types + Healthcheck basique (1j, 🟢 Risque faible)
- **PR2**: Client Supabase + Pages stubs + Migrations DB (1j, 🟢 Risque faible)

### **Phase 2 - 🔒 SÉCURITÉ CRITIQUE (4-5 jours)**
- **PR3**: Auth Clerk basique + Routes protégées (2j, 🟡 Risque moyen)
- **PR4**: 🔴 External JWT + RLS + Policies complètes (3j, 🔴 Risque élevé)
- **PR5**: Fix UUID développement + Tests isolation utilisateurs (1j, 🔴 Risque élevé)

### **Phase 3 - UI avec Sécurité Active (3-4 jours)**
- **PR6**: UI Assistants (Liste + Création avec user_id réel) (2j, 🟡 Risque moyen)
- **PR7**: UI Éditeur + ElevenLabs + Audio (2j, 🟡 Risque moyen)

### **Phase 4 - Intégrations Robustes (5-6 jours)**
- **PR8**: 🔴 Twilio + Numéros + Idempotence + Monitoring (3j, 🔴 Risque élevé)
- **PR9**: Cal.com + Outils + Tests (2j, 🟡 Risque moyen)

### **Phase 5 - Business & Finalisation (3-4 jours)**
- **PR10**: Stripe + Gating + Resend + Dashboard monitoring (2j, 🟡 Risque moyen)
- **PR11**: Documentation + Checklists + Agent Python healthcheck (1j, 🟢 Risque faible)

### **Estimation Totale : 17-22 jours ouvrés**

---

## Annexe — Mapping de Fichiers

- À migrer tel quel (phase 1):
  - `src/components/Assistants/*`, `src/services/elevenLabsService.ts`, `src/integrations/supabase/{client.ts,types.ts}`
  - `supabase/functions/*`, `supabase/migrations/*`, `supabase/config.toml`
  - `zora_agent.py`, `calendar_api.py`, `requirements.txt`, `test_*.py`

- À adapter:
  - Routing React Router → App Router
  - `client.ts` → env Next public
  - Politiques RLS (réactivation)

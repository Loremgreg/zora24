# Zora × CodeGuide Starter Kit — Setup Checklist (VERSION CORRIGÉE)

⚠️ **VERSION MISE À JOUR** : Synchronisée avec le plan de migration corrigé du 17/09/2025

Objectif: démarrer un projet CodeGuide (Next.js 15, Clerk, Supabase, Tailwind v4, shadcn/ui), brancher le cœur Zora (assistants, Edge Functions, agent Python) et activer RLS avec sécurité renforcée.

## 0) Prérequis
- Node 18+
- Comptes: Clerk, Supabase, Stripe (plus tard), Resend (plus tard)
- Clés API ultérieures: OpenAI/Anthropic (UI chat), LiveKit/OpenAI/Deepgram/ElevenLabs (agent)
- ✅ **Corrections préalables appliquées** : UUID fixe supprimé, policies RLS ajoutées, Edge Functions sécurisées

## 1) Scaffold CodeGuide
- Cloner le repo CodeGuide
- Installer dépendances: `pnpm i` (ou npm/yarn)
- Copier `.env.example` → `.env.local`
- Lancer: `pnpm dev` → http://localhost:3000

## 2) Clerk
- Créer l'app, récupérer `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- Ajouter dans `.env.local`

## 3) Supabase (client app)
- Créer projet, récupérer `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Ajouter dans `.env.local`

## 4) 🔒 SÉCURITÉ FIRST - External JWT + RLS (PHASE CRITIQUE)

⚠️ **DÉPLACÉ EN PHASE 2** : Sécurité active AVANT développement UI

### 4.1) Auth Clerk Basique
- Configurer Clerk providers et middleware
- Protéger les routes privées (`/assistants/*`)
- Tester login/logout basique

### 4.2) External JWT & RLS
- Clerk → JWT Templates → créer `supabase` (HS256), claims: `sub={{user.id}}`
- Supabase → Project Settings → API → définir le JWT secret avec la clé du template
- Next (server): `await auth().getToken({ template: 'supabase' })`
- Détails: voir `docs/SETUP_CLERK_SUPABASE_RLS.md`

### 4.3) Policies RLS Complètes
- ✅ **CORRECTION APPLIQUÉE** : Policies pour `phone_numbers` et `sip_trunks` ajoutées
- Appliquer migration `20250917120000_add_missing_rls_policies.sql`
- Supprimer l'UUID "fixe dev" côté création d'assistant (déjà fait)

### 4.4) Stratégie de Fallback
- Implémenter proxy server-side temporaire si External JWT échoue
- Routes API Next.js avec service-role + vérification applicative

## 5) Types & client Supabase
- Copier vos types Supabase (ex: `src/integrations/supabase/types.ts`) dans le nouveau projet
- Ajouter un client server-side (voir `docs/STUBS_CODEGUIDE_STARTER.md`, fichier `src/lib/supabase/server.ts`)
- Appliquer les migrations `supabase/migrations/*` (DB Supabase)

## 6) Pages & composants Zora (avec sécurité active)
- Créer pages App Router:
  - `src/app/(dashboard)/assistants/page.tsx`
  - `src/app/(dashboard)/assistants/[id]/page.tsx`
- Copier: `src/components/Assistants/*` (AssistantsList, CreateAssistantModal, AssistantEditor, VoiceSelector, NumberManagement, ToolsManagement)
- Adapter imports alias `@/` et navigation `useRouter().push`

## 7) Audio ElevenLabs (frontend) - Quick Win
- Reprendre `src/services/elevenLabsService.ts` et vérifier la lecture Web Audio
- Continuer d'appeler Edge Function `elevenlabs-tts`
- Vérifier sur Supabase: `ELEVENLABS_API_KEY`

## 8) 🔴 Twilio — Recherche/Achat Numéros (Sécurité Renforcée)

⚠️ **ATTENTION** : Étape critique avec améliorations sécurité

### 8.1) Edge Functions Twilio
- ✅ **CORRECTION APPLIQUÉE** : Idempotence + retry logic ajoutés
- Garder: `elevenlabs-tts`, `search-phone-numbers`, `purchase-phone-number`, `create-twilio-subaccount`
- Secrets projet Supabase: `SUPABASE_SERVICE_ROLE_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `ELEVENLABS_API_KEY`

### 8.2) Améliorations Sécurité
- ✅ **Idempotency keys** pour éviter double facturation
- ✅ **Retry logic** avec backoff exponentiel
- ✅ **Monitoring** coûts Twilio et alertes
- 🔄 **PLANIFIER** chiffrement `twilio_auth_token`
- Appels côté Next: `supabase.functions.invoke('nom-fonction', { body })`

## 9) Outils Cal.com
- UI: `ToolsManagement`, Edge: `get/save-assistant-calcom-config`, `test-calcom-connection`
- Conserver `assistants.tools_config` (JSONB)

## 10) Stripe — Gating des fonctionnalités
- Gérer l'accès aux features premium (création assistants, achat de numéros, activation Cal.com)
- Webhooks Stripe → mise à jour d'un état d'abonnement (table DB) et middleware côté Next
- Implémenter gating hybride (DB + middleware)

## 11) Resend — Emails & Notifications
- Configurer Resend pour les emails transactionnels
- Templates d'emails (confirmation, notifications)
- Intégration avec les webhooks Stripe

## 12) Agent Python
- Local: `pip install -r requirements.txt` puis `python zora_agent.py start`
- `.env` agent: `LIVEKIT_*`, `OPENAI_API_KEY`, `DEEPGRAM_API_KEY`, `ELEVEN_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- Déployer séparément (Render/Railway/Fly)

## 13) Monitoring & Observabilité (NOUVEAU)

⚠️ **AJOUTÉ** : Monitoring incrémental dès le début

- **Healthcheck basique** : Endpoint `/api/health` dès le départ
- **Logs RLS** : Tracer succès/échecs d'authentification
- **Monitoring Twilio** : Coûts, erreurs, double-achats
- **Agent Python** : Healthcheck + métriques LiveKit
- **Dashboard complet** : Supabase Analytics + Vercel Analytics

## 14) Déploiement Vercel
- Ajouter envs: Clerk, Supabase (`NEXT_PUBLIC_*`), Stripe, Resend
- Ne pas exposer: `SUPABASE_SERVICE_ROLE_KEY`, `TWILIO_*`, `ELEVENLABS_API_KEY` (restent côté Supabase/serveur)

## 15) 🔄 NOUVEAU Découpage en PRs (Sécurité First)

⚠️ **11 PRs granulaires** au lieu de 7 étapes simples

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

## 16) QA (avec sécurité active)
- ✅ Auth Clerk OK, RLS OK (avec policies complètes)
- ✅ Assistants: création/édition/liste (avec user_id réel)
- ✅ Audio ElevenLabs OK
- ✅ Twilio: recherche + achat OK (avec idempotence)
- ✅ Cal.com: sauvegarde + test OK
- ✅ Optionnel: Stripe Checkout/Portal, Resend email test OK

## 17) ✅ Corrections Appliquées (Backlog Sécurité Mis à Jour)
- ✅ **UUID fixe supprimé** dans CreateAssistantModal
- ✅ **Policies RLS manquantes ajoutées** (phone_numbers + sip_trunks)
- ✅ **Idempotence Edge Functions** implémentée
- ✅ **Retry logic** avec backoff ajoutée
- 🔄 **Chiffrement twilio_auth_token** planifié
- ✅ **Monitoring/analytics** (Supabase logs, Vercel Analytics)


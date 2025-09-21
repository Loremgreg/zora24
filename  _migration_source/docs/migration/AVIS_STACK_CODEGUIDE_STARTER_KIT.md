# Avis Sur Le Stack « CodeGuide Starter Kit »

Ce document évalue l’adéquation du stack CodeGuide Starter Kit avec l’application Zora24.ai et propose des recommandations d’intégration.

Stack annoncé:
- Framework: Next.js 15 (App Router)
- Langage: TypeScript
- Authentication: Clerk
- Database: Supabase
- Styling: Tailwind CSS v4
- UI Components: shadcn/ui
- AI Integration: Vercel AI SDK
- Theme System: next-themes

## Verdict

Très bon fit global, meilleur que « Ship-fast » pour Zora24.ai, car il s’aligne nativement avec Supabase (DB existante, migrations SQL, Edge Functions). Le point d’attention principal est l’authentification: Clerk n’est pas Supabase Auth, il faut donc soigner l’intégration RLS/identité. En dehors de ça, l’ensemble est moderne, bien outillé et cohérent avec vos besoins.

## Points Forts

- Supabase (DB): alignement direct avec votre schéma actuel (`assistants`, `phone_numbers`, `sip_trunks`), migrations SQL et Edge Functions réutilisables sans réécriture.
- Next.js 15 + App Router + TypeScript: fondation front robuste pour pages privées, SEO et routes server.
- shadcn/ui + Tailwind v4: système UI productif et composables, proche de vos primitives actuelles.
- Vercel AI SDK: utile pour des interfaces AI (chat, streaming), complémentaire à LiveKit côté voix.
- next-themes: theming out‑of‑the‑box.

## Points De Friction / Questions Ouvertes

- Auth Clerk vs RLS Supabase:
  - Vos policies RLS actuelles reposent sur `auth.uid()` Supabase. Avec Clerk, deux voies:
    1) External JWT vers Supabase: configurer Supabase pour valider le JWT Clerk (JWKS), et mapper `jwt.sub` à l’identifiant utilisateur de vos tables, afin que RLS fonctionne (policies basées sur `request.jwt.claims.sub`).
    2) Proxy serveur: exécuter les accès DB via un backend server-side (route handler) en service-role et implémenter l’autorisaton applicative (moins élégant que RLS, mais simple à court terme).
  - Recommandé: l’option External JWT pour conserver la sécurité RLS côté DB.

- Stripe/Emails non listés: si le starter kit ne les inclut pas, il faudra ajouter Stripe (Checkout + Portal) et un provider email (Resend) pour couvrir votre périmètre SaaS.

- Tailwind v4: vérifier les éventuels breaking changes vs votre code actuel (plugins/classes). Migration généralement simple.

- UI: bascule vers shadcn/ui peut nécessiter d’adapter quelques composants existants (ou conserver vos primitives si souhaité).

## Recommandations

1) Adopter CodeGuide Starter Kit comme base.
2) Conserver Supabase Edge Functions existantes (Twilio, ElevenLabs, Cal.com) et continuer à les appeler via `supabase.functions.invoke`.
3) Intégrer Clerk avec Supabase RLS via External JWT:
   - Configurer Supabase pour accepter le JWT Clerk (JWKS),
   - Définir des policies RLS basées sur `jwt.sub` (ou un claim dédié) mappé à `assistants.user_id`.
   - Alternative courte: proxy server-side avec service-role et vérifications d’accès.
4) Ajouter Stripe et Resend si absents du kit, et mettre en place le gating des features (création assistants, achat numéro, outils).
5) Reprendre vos types Supabase générés et remplacer les accès hardcodés par env (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

## Plan D’Intégration Résumé

- Envs & Clients:
  - Créer client Supabase (browser/server) avec env Next; importer `src/integrations/supabase/types.ts`.
  - Configurer Clerk (providers, middleware) et sécuriser les routes privées.
  - Mettre en place External JWT Supabase ou proxy server pour l’autorisation.

- DB & RLS:
  - Appliquer vos migrations `supabase/migrations/*`.
  - Réactiver RLS et adapter les policies à l’identité Clerk (via `jwt.sub`).
  - Supprimer l’UUID fixe de dev dans la création d’assistant.

- Portage UI (App Router):
  - Pages: `/assistants` et `/assistants/[id]` (rendre vos composants `AssistantsList`, `AssistantEditor`).
  - Rebrancher `NumberManagement`, `ToolsManagement`, `VoiceSelector`, et `elevenLabsService`.

- Intégrations:
  - Conserver les Edge Functions Supabase (Twilio/ElevenLabs/Cal.com) et leurs secrets côté Supabase.
  - Ajouter Stripe (Checkout/Portal) et Resend; brancher le gating d’abonnement.

- QA & Déploiement:
  - Local: Next dev + Supabase CLI (Edge) + Agent Python.
  - Prod: Vercel (web), Supabase (DB/Edge), hébergeur pour l’agent (Railway/Render/Fly).

## Risques & Mitigations

- RLS avec Clerk: valider tôt la stratégie External JWT (claims, mappage, policies). En cas de blocage, basculer sur proxy serveur avec service-role temporairement.
- Secrets: garder `SUPABASE_SERVICE_ROLE_KEY`, `TWILIO_*`, `ELEVENLABS_API_KEY` côté Supabase/serveur, jamais côté client.
- Stripe gating: bien définir les garde-fous sur les actions sensibles (achat numéro, création assistant).

## Conclusion

CodeGuide Starter Kit est une excellente base pour Zora24.ai. Il réduit fortement l’effort de migration par rapport à un boilerplate Mongo, tout en offrant un stack moderne et compatible avec vos Edge Functions et votre agent Python. Le principal point d’ingénierie est l’alignement Clerk ↔ Supabase RLS — résoluble via External JWT ou un proxy serveur.


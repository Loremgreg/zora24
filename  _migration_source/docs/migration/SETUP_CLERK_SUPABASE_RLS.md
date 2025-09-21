# Setup Clerk → Supabase (RLS) — Guide Court

Objectif: permettre à Supabase (Postgres) d’appliquer les RLS avec l’identité Clerk, sans réécrire toute l’auth côté serveur. On utilise un JWT “template” émis par Clerk et vérifié par Supabase.

## 1) Créer un JWT Template dans Clerk

- Dans Clerk Dashboard → JWT Templates → Create Template (ex: `supabase`).
- Algorithme: HS256 (HMAC) pour démarrer simplement.
- Signing Key: générer un secret (à stocker en sécurité, ce sera le “JWT secret” côté Supabase).
- Claims suggérés:
  - `sub`: l’ID Clerk de l’utilisateur (`{{user.id}}`).
  - `email`: `{{user.primary_email_address}}` (optionnel).
  - `role` (optionnel): ex. `user`/`admin` si vous avez besoin de policies plus fines.

Résultat: vous pourrez appeler `getToken({ template: 'supabase' })` dans votre app pour obtenir un token signé.

## 2) Configurer Supabase pour vérifier le JWT Clerk

- Dans Supabase → Project Settings → API → “JWT Secret” (ou PostgREST/JWT settings), définir le secret du template Clerk (Signing Key HS256).
- Audiences (si applicable): ajouter `authenticated` (ou la valeur utilisée) et vérifier que PostgREST valide bien le token.
- Option avancée: si vous voulez RS256 + JWKS, basculez le template Clerk sur RS256 et configurez Supabase pour récupérer la JWKS (plus complexe; HS256 suffit au début).

## 3) Mettre à jour les Policies RLS

Exemple pour la table `assistants (user_id UUID/TEXT)`:

```sql
-- Helper: récupérer le sub du JWT Clerk
-- (cast JSONB → TEXT pour comparaison)
create or replace function auth.jwt_sub()
returns text language sql stable as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')
$$;

-- SELECT: un utilisateur ne voit que ses assistants
create policy "Users can view their assistants"
on public.assistants
for select
using (auth.jwt_sub() = user_id::text);

-- INSERT: un utilisateur ne peut insérer que pour lui-même
create policy "Users can insert their assistants"
on public.assistants
for insert
with check (auth.jwt_sub() = user_id::text);

-- UPDATE/DELETE idem si nécessaire
```

Répétez le schéma pour `phone_numbers` en joignant sur `assistants.user_id`.

Important: réactiver RLS si elle a été désactivée temporairement (voir migrations).

## 4) Client Supabase côté Serveur (Next.js)

Instancier un client Supabase “server-side” avec le token Clerk template pour que PostgREST applique les RLS.

```ts
// lib/supabase/server.ts
import { cookies } from 'next/headers'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export async function createServerSupabase() {
  const { getToken } = auth()
  const jwt = await getToken({ template: 'supabase' })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
      },
      auth: { persistSession: false },
    }
  )
  return supabase
}
```

Utilisation dans un route handler/server component:

```ts
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.from('assistants').select('*')
  // RLS s’applique ici selon le sub du token Clerk
}
```

## 5) Client Supabase côté Navigateur (optionnel)

Si vous avez besoin d’appels directs depuis le client (moins recommandé au début), vous pouvez utiliser le token template côté client:

```ts
import { useAuth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

export function useBrowserSupabase() {
  const { getToken } = useAuth()
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function withAuth() {
    const jwt = await getToken({ template: 'supabase' })
    supabase.rest.defaults.headers["Authorization"] = jwt ? `Bearer ${jwt}` : ''
    return supabase
  }

  return { withAuth }
}
```

Conseil: préférez les accès server-side tant que possible (meilleur contrôle et logs).

## 6) Tests & Débogage

- Vérifier un `select * from assistants` avec un utilisateur A et B; s’assurer qu’ils ne voient que leurs lignes.
- En cas d’accès refusé: inspecter `current_setting('request.jwt.claims', true)` côté SQL pour voir le JWT reçu.
- S’assurer que l’UUID vs TEXT est cohérent (`user_id::text`).

## 7) Sécurité & Secrets

- Ne divulguez jamais la clé service-role Supabase côté client.
- Le secret HS256 du template Clerk doit être stocké côté Supabase (et éventuellement en variable d’env côté infra, pas côté client).
- Si vous migrez vers RS256/JWKS: bien tester la résolution des clés et la rotation.


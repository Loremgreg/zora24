# Stubs Pour CodeGuide Starter Kit (à copier dans le nouveau projet)

Ce document fournit des squelettes de fichiers (stubs) à déposer dans votre nouveau projet CodeGuide Starter Kit. Ils sont minimalistes, compilables, et contiennent des TODO pour brancher vos composants et la RLS.

Hypothèses:
- Alias d’import `@` pointe vers `src`.
- Clerk est configuré et opérationnel.
- Supabase: variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` présentes.
- External JWT (Clerk → Supabase) selon `docs/SETUP_CLERK_SUPABASE_RLS.md`.

---

## 1) Client Supabase côté serveur

Path: `src/lib/supabase/server.ts`

```ts
// src/lib/supabase/server.ts
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

## 2) Client Supabase côté navigateur (optionnel)

Path: `src/lib/supabase/client.ts`

```ts
// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

---

## 3) Page liste des assistants (App Router)

Path: `src/app/(dashboard)/assistants/page.tsx`

```tsx
// src/app/(dashboard)/assistants/page.tsx
import { auth } from '@clerk/nextjs/server'
import { createServerSupabase } from '@/lib/supabase/server'

export default async function AssistantsPage() {
  const { userId } = auth()
  const supabase = await createServerSupabase()

  // TODO: remplacez par votre composant réel `AssistantsList`
  const { data: assistants } = await supabase
    .from('assistants')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Assistants</h1>
      <pre className="text-sm bg-muted p-4 rounded">{JSON.stringify({ userId, assistants }, null, 2)}</pre>
      {/* TODO: <AssistantsList /> */}
    </main>
  )
}
```

## 4) Page éditeur d’assistant

Path: `src/app/(dashboard)/assistants/[id]/page.tsx`

```tsx
// src/app/(dashboard)/assistants/[id]/page.tsx
import { createServerSupabase } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

type Props = { params: { id: string } }

export default async function AssistantEditorPage({ params }: Props) {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('assistants')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !data) return notFound()

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Assistant</h1>
      <pre className="text-sm bg-muted p-4 rounded">{JSON.stringify(data, null, 2)}</pre>
      {/* TODO: <AssistantEditor /> */}
    </main>
  )
}
```

---

## 5) Webhook Stripe (squelette)

Path: `src/app/api/stripe/webhook/route.ts`

```ts
// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
// import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  // TODO: vérifier la signature Stripe (Stripe-Signature) avec STRIPE_WEBHOOK_SECRET
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  try {
    const rawBody = await req.text()
    // const event = stripe.webhooks.constructEvent(rawBody, req.headers.get('stripe-signature')!, process.env.STRIPE_WEBHOOK_SECRET!)
    // TODO: router l'event et mettre à jour l'état d'abonnement en DB
    return NextResponse.json({ received: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
```

## 6) Email Resend (test simple)

Path: `src/app/api/email/test/route.ts`

```ts
// src/app/api/email/test/route.ts
import { NextResponse } from 'next/server'
// import { Resend } from 'resend'

export async function POST() {
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({ from, to, subject, html })
  return NextResponse.json({ ok: true })
}
```

## 7) Healthcheck minimal

Path: `src/app/api/health/route.ts`

```ts
// src/app/api/health/route.ts
import { NextResponse } from 'next/server'
export async function GET() { return NextResponse.json({ ok: true }) }
```

---

## 8) Notes Supabase Edge Functions

- Conservez vos fonctions existantes dans votre projet Supabase actuel:
  - `elevenlabs-tts`, `search-phone-numbers`, `purchase-phone-number`, `create-twilio-subaccount`,
    `get-assistant-calcom-config`, `save-assistant-calcom-config`, `test-calcom-connection`.
- Côté Next, appelez-les depuis le client Supabase (server/browser) avec `supabase.functions.invoke('nom-fonction', { body })`.
- Secrets (service-role, Twilio, ElevenLabs) demeurent côté Supabase — ne jamais exposer au client.

## 9) TODO de portage composants

- Copier dans `src/components` vos composants actuels:
  - `components/Assistants/*` (AssistantsList, CreateAssistantModal, AssistantEditor, VoiceSelector, NumberManagement, ToolsManagement)
- Adapter les imports d’alias `@/` et les hooks de navigation (`useRouter`).
- Brancher progressivement les composants dans les pages stubs (sections TODO ci‑dessus).

```
Checklist rapide:
[ ] Env Next + Clerk + Supabase OK
[ ] External JWT Clerk → Supabase OK (voir guide RLS)
[ ] Pages assistants rendues (liste + éditeur)
[ ] Edge Functions appelées depuis Next
[ ] Stripe webhook et Resend testés (plus tard)
```


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

-- Migration: Ajouter les policies RLS manquantes pour phone_numbers et sip_trunks
-- Date: 2025-09-17
-- Objectif: Corriger les failles de sécurité identifiées dans la review

-- Helper function pour récupérer le sub du JWT Clerk (si pas déjà créée)
CREATE OR REPLACE FUNCTION auth.jwt_sub()
RETURNS TEXT LANGUAGE SQL STABLE AS $$
  SELECT COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')
$$;

-- Policy pour phone_numbers : un utilisateur ne peut gérer que les numéros de ses assistants
CREATE POLICY "Users can view their phone numbers"
ON public.phone_numbers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.assistants 
    WHERE assistants.id = phone_numbers.assistant_id 
    AND auth.jwt_sub() = assistants.user_id::text
  )
);

CREATE POLICY "Users can insert phone numbers for their assistants"
ON public.phone_numbers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.assistants 
    WHERE assistants.id = phone_numbers.assistant_id 
    AND auth.jwt_sub() = assistants.user_id::text
  )
);

CREATE POLICY "Users can update their phone numbers"
ON public.phone_numbers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.assistants 
    WHERE assistants.id = phone_numbers.assistant_id 
    AND auth.jwt_sub() = assistants.user_id::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.assistants 
    WHERE assistants.id = phone_numbers.assistant_id 
    AND auth.jwt_sub() = assistants.user_id::text
  )
);

CREATE POLICY "Users can delete their phone numbers"
ON public.phone_numbers
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.assistants 
    WHERE assistants.id = phone_numbers.assistant_id 
    AND auth.jwt_sub() = assistants.user_id::text
  )
);

-- Policy pour sip_trunks : un utilisateur ne peut voir que les trunks liés à ses numéros
CREATE POLICY "Users can view their sip trunks"
ON public.sip_trunks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.phone_numbers pn
    JOIN public.assistants a ON a.id = pn.assistant_id
    WHERE pn.twilio_sid = sip_trunks.twilio_sid
    AND auth.jwt_sub() = a.user_id::text
  )
);

-- Réactiver RLS sur les tables si pas déjà fait
-- (sera fait lors de la migration vers Clerk)
-- ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.sip_trunks ENABLE ROW LEVEL SECURITY;

-- Commentaires pour documentation
COMMENT ON POLICY "Users can view their phone numbers" ON public.phone_numbers IS 
'RLS Policy: Les utilisateurs ne peuvent voir que les numéros de téléphone liés à leurs assistants';

COMMENT ON POLICY "Users can view their sip trunks" ON public.sip_trunks IS 
'RLS Policy: Les utilisateurs ne peuvent voir que les SIP trunks liés à leurs numéros de téléphone';

-- Log de la migration pour traçabilité
INSERT INTO public.migration_log (migration_name, description, applied_at) 
VALUES (
  '20250917120000_add_missing_rls_policies',
  'Ajout des policies RLS manquantes pour phone_numbers et sip_trunks - Correction failles sécurité',
  NOW()
) ON CONFLICT DO NOTHING;
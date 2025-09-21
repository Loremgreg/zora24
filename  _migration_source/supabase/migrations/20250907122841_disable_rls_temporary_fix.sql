-- TEMPORAIRE : Désactiver RLS pour débloquer le développement
-- ATTENTION : Cette migration désactive la sécurité au niveau des lignes
-- À réactiver en production avec authentification Supabase appropriée

-- Désactiver RLS sur la table assistants
ALTER TABLE public.assistants DISABLE ROW LEVEL SECURITY;

-- Désactiver RLS sur la table phone_numbers  
ALTER TABLE public.phone_numbers DISABLE ROW LEVEL SECURITY;

-- Ajouter des commentaires de sécurité pour documentation
COMMENT ON TABLE public.assistants IS 'RLS TEMPORAIREMENT DÉSACTIVÉ - À réactiver avec authentification Supabase en production';
COMMENT ON TABLE public.phone_numbers IS 'RLS TEMPORAIREMENT DÉSACTIVÉ - À réactiver avec authentification Supabase en production';

-- Log de la modification pour traçabilité
INSERT INTO public.migration_log (migration_name, description, applied_at) 
VALUES (
  '20250907122841_disable_rls_temporary_fix',
  'Désactivation temporaire RLS pour débloquer développement - assistant visibility fix',
  NOW()
) ON CONFLICT DO NOTHING;
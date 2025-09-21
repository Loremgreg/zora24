-- Temporairement modifier les politiques RLS pour permettre la création d'assistants sans authentification
-- (À remplacer par une vraie authentification plus tard)

-- Supprimer les politiques existantes qui nécessitent auth.uid()
DROP POLICY IF EXISTS "Users can create their own assistants" ON assistants;
DROP POLICY IF EXISTS "Users can view their own assistants" ON assistants;
DROP POLICY IF EXISTS "Users can update their own assistants" ON assistants;
DROP POLICY IF EXISTS "Users can delete their own assistants" ON assistants;

-- Créer des politiques temporaires plus permissives (à remplacer quand l'auth sera implémentée)
CREATE POLICY "Temporary: Allow all operations on assistants" 
ON assistants 
FOR ALL 
USING (true) 
WITH CHECK (true);
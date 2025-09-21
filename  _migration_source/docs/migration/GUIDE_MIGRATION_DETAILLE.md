# Guide de Migration Détaillé pour Novices

### **1 & 2. "Copier le contenu depuis `docs/migration/STUBS_CODEGUIDE_STARTER.md`"**

Il ne faut **surtout pas** copier tout le contenu du fichier `.md`.

Ce fichier Markdown (`.md`) sert de "bibliothèque" de bouts de code prêts à l'emploi. Tu dois trouver le bon bout de code à l'intérieur de ce fichier, le copier, puis le coller dans un **nouveau fichier** que tu vas créer dans ton projet.

**Procédure détaillée pour `health/route.ts` :**

1.  **Ouvre le fichier "bibliothèque"** : Dans ton éditeur de code (comme VS Code), ouvre le fichier `docs/migration/STUBS_CODEGUIDE_STARTER.md`.

2.  **Trouve le bon code** : Fais défiler ce fichier jusqu'à ce que tu trouves le titre :
    ```markdown
    ## 7) Healthcheck minimal
    ```

3.  **Identifie le bloc de code** : Juste en dessous de ce titre, tu verras un bloc de code qui ressemble à ça :
    ````markdown
    Path: `src/app/api/health/route.ts`

    ```ts
    // src/app/api/health/route.ts
    import { NextResponse } from 'next/server'
    export async function GET() { return NextResponse.json({ ok: true }) }
    ```
    ````

4.  **Crée le nouveau fichier** :
    *   Maintenant, va dans ton **nouveau projet** (`Codeguide-starter`).
    *   Navigue dans le dossier `src/`.
    *   Crée un dossier nommé `app/`. À l'intérieur, crée un dossier `api/`. À l'intérieur, crée un dossier `health/`.
    *   Dans ce dossier `health/`, crée un nouveau fichier vide et nomme-le `route.ts`.
    *   Le chemin complet sera : `src/app/api/health/route.ts`.

5.  **Copie et Colle** :
    *   Retourne dans le fichier `STUBS_CODEGUIDE_STARTER.md`.
    *   Sélectionne et copie **uniquement le code JavaScript/TypeScript** à l'intérieur du bloc de code (les 3 lignes qui commencent par `// src/app/api...`).
    *   Va dans le fichier `route.ts` que tu viens de créer, et colle ce code.

Et voilà ! Tu as "copié le contenu" pour créer ton fichier de healthcheck. C'est la même logique pour tous les autres points.

---

### **3. "Comment appliquer les migrations Supabase ?"**

Cette étape envoie la structure de ta base de données (tables, colonnes, etc.) vers ton projet Supabase en ligne.

**Prérequis :**
*   Tu dois avoir la **Supabase CLI** (Command Line Interface) installée. Si ce n'est pas le cas, ouvre un terminal et tape :
    ```bash
    npm install -g supabase
    ```
*   Tu dois avoir copié le dossier `supabase/migrations` de ton **ancien projet** vers ton **nouveau projet**.

**Procédure détaillée :**

1.  **Ouvre un terminal** (ou la console intégrée de ton éditeur de code).

2.  **Navigue jusqu'au dossier de ton nouveau projet** :
    ```bash
    cd /chemin/vers/ton/nouveau/projet/Codeguide-starter
    ```

3.  **Connecte ton projet local à ton projet Supabase en ligne** :
    *   Tape la commande suivante :
        ```bash
        supabase link --project-ref VOTRE_ID_PROJET
        ```
    *   **Où trouver `VOTRE_ID_PROJET` ?**
        *   Va sur [app.supabase.com](https://app.supabase.com).
        *   Ouvre ton projet.
        *   Va dans `Project Settings` (l'icône en forme de roue dentée) > `General`.
        *   Le `Reference ID` est affiché là. Copie-le.
    *   La CLI te demandera peut-être de te connecter.

4.  **Applique les migrations** :
    *   Une fois que le projet est "linké", tape la commande :
        ```bash
        supabase db push
        ```
    *   Cette commande va analyser tous les fichiers `.sql` dans ton dossier `supabase/migrations`, les comparer à ta base de données en ligne, et appliquer tous les changements manquants. C'est ce qui va magiquement créer tes tables `assistants`, `phone_numbers`, etc.

---

### **4 & 5. "Détaille la procédure pour créer les clients Supabase et les pages stubs"**

C'est exactement la même procédure que pour le point 1, mais pour des fichiers différents.

**Procédure détaillée pour les clients Supabase :**

1.  **Ouvre** `docs/migration/STUBS_CODEGUIDE_STARTER.md`.
2.  **Pour `server.ts`** :
    *   Trouve la section `## 1) Client Supabase côté serveur`.
    *   Dans ton nouveau projet, crée le chemin `src/lib/supabase/`.
    *   Crée un fichier `server.ts` à l'intérieur.
    *   Copie le bloc de code de la section 1 et colle-le dans `server.ts`.
3.  **Pour `client.ts`** :
    *   Trouve la section `## 2) Client Supabase côté navigateur (optionnel)`.
    *   Dans le même dossier `src/lib/supabase/`, crée un fichier `client.ts`.
    *   Copie le bloc de code de la section 2 et colle-le dans `client.ts`.

**Procédure détaillée pour les pages "stubs" :**

1.  **Ouvre** `docs/migration/STUBS_CODEGUIDE_STARTER.md`.
2.  **Pour la page de liste** :
    *   Trouve la section `## 3) Page liste des assistants (App Router)`.
    *   Dans ton nouveau projet, crée le chemin `src/app/(dashboard)/assistants/`.
    *   Crée un fichier `page.tsx` à l'intérieur.
    *   Copie le bloc de code de la section 3 et colle-le dans ce `page.tsx`.
3.  **Pour la page de l'éditeur** :
    *   Trouve la section `## 4) Page éditeur d’assistant`.
    *   Dans ton nouveau projet, crée le chemin `src/app/(dashboard)/assistants/[id]/`. (Les crochets `[]` sont importants, c'est une syntaxe de Next.js pour les pages dynamiques).
    *   Crée un fichier `page.tsx` à l'intérieur de ce dossier `[id]`.
    *   Copie le bloc de code de la section 4 et colle-le dans ce `page.tsx`.

J'espère que ces explications très détaillées sont plus claires. N'hésite pas si un autre point te semble flou.

---

### Phase 3 : Migration de l'UI (PR6 & PR7) - **DÉTAILLÉE**

Maintenant que la sécurité est en place, on peut porter l'interface utilisateur.

1.  **Copier les composants React** :
    *   Dans l'explorateur de fichiers de ton ordinateur, ouvre le dossier de ton **ancien projet**.
    *   Navigue vers `src/components/` et copie l'intégralité du dossier `Assistants`.
    *   Maintenant, va dans ton **nouveau projet** (`Codeguide-starter`), navigue vers `src/components/` et colle le dossier `assistants` que tu viens de copier.
    *   Fais de même pour le fichier `src/services/elevenLabsService.ts` : copie-le de l'ancien projet et colle-le dans le nouveau, par exemple dans `src/lib/services/`.

2.  **Adapter le code (l'étape la plus manuelle)** :
    Ouvre le dossier `src/components/assistants` dans ton éditeur de code. Tu vas probablement voir des erreurs (lignes rouges). C'est normal. Voici comment les corriger :

    *   **Adapter la Navigation** :
        *   **Problème** : Ton ancien projet utilisait `react-router-dom` avec un hook `useNavigate`. Next.js utilise un autre système.
        *   **Solution** : Dans chaque fichier où tu vois une erreur sur `useNavigate`, tu dois le remplacer.
        *   **Exemple AVANT (ancien code)** :
            ```tsx
            import { useNavigate } from 'react-router-dom';

            const navigate = useNavigate();
            // ... quelque part dans une fonction
            navigate(`/assistants/${assistant.id}`);
            ```
        *   **Exemple APRÈS (nouveau code pour Next.js)** :
            ```tsx
            import { useRouter } from 'next/navigation'; // Attention, l'import change !

            const router = useRouter();
            // ... quelque part dans une fonction
            router.push(`/assistants/${assistant.id}`);
            ```

    *   **Adapter les Imports** :
        *   **Problème** : Les chemins vers d'autres fichiers ont changé. Par exemple, `src/integrations/supabase/client` n'existe plus.
        *   **Solution** : Tu dois mettre à jour les chemins. Dans un projet Next.js, le symbole `@/` est un raccourci pour le dossier `src/`.
        *   **Exemple AVANT** :
            ```tsx
            import { supabase } from 'src/integrations/supabase/client';
            ```
        *   **Exemple APRÈS** :
            ```tsx
            import { supabaseBrowser as supabase } from '@/lib/supabase/client'; // Le chemin et parfois le nom ont changé
            ```
        *   **Astuce** : Regarde les erreurs dans ton éditeur. Il te dira quel import ne fonctionne pas. Ton but est de le faire pointer vers le bon fichier dans ta nouvelle structure (`@/lib/...`).

3.  **Intégrer les composants** :
    Maintenant que tes composants sont (presque) corrigés, il faut les afficher dans les pages que tu as créées.

    *   **Pour la page de liste** :
        *   Ouvre `src/app/(dashboard)/assistants/page.tsx`.
        *   **AVANT** : Le fichier contient une ligne comme `<pre>{JSON.stringify(assistants)}</pre>`.
        *   **APRÈS** : Remplace cela par ton vrai composant.
            ```tsx
            import AssistantsList from '@/components/assistants/AssistantsList'; // Importe ton composant

            export default async function AssistantsPage() {
              // ... (le code qui récupère les assistants reste le même)

              return (
                <main className="p-6">
                  <h1 className="text-2xl font-semibold mb-4">Assistants</h1>
                  <AssistantsList initialAssistants={assistants} />
                  {/* Note: tu devras peut-être adapter ton composant pour qu'il accepte les données comme ça */}
                </main>
              )
            }
            ```
    *   Fais la même chose pour `src/app/(dashboard)/assistants/[id]/page.tsx` en y intégrant ton composant `<AssistantEditor />`.

---

### Phase 4 : Intégrations Backend (PR8 & PR9) - **DÉTAILLÉE**

Tes Edge Functions restent sur Supabase. On vérifie juste que le "tuyau" entre ton nouveau frontend et Supabase fonctionne.

1.  **Vérifier les appels aux Edge Functions (Comment tester concrètement)** :
    *   **Exemple avec la recherche de numéro** :
        1.  Lance ton nouveau projet (`pnpm dev`) et connecte-toi.
        2.  Navigue vers la page d'édition d'un assistant, là où se trouve le composant `NumberManagement`.
        3.  Ouvre les **outils de développement** de ton navigateur (touche F12 ou Clic droit > Inspecter).
        4.  Va dans l'onglet **"Network"** (ou "Réseau").
        5.  Clique sur le bouton "Rechercher des numéros" dans ton application.
        6.  Dans l'onglet "Network", tu devrais voir apparaître une nouvelle ligne. Clique dessus.
        7.  **Vérification** : Le nom de la requête doit contenir `invoke/search-phone-numbers`. Le statut doit être `200 OK`. Si c'est le cas, ça fonctionne !
    *   Fais ce test pour chaque fonctionnalité qui appelle une Edge Function (test de voix, achat de numéro, test Cal.com, etc.).

2.  **Vérifier les secrets (Où regarder ?)** :
    *   **C'est une vérification de sécurité cruciale.** Ces clés ne doivent JAMAIS être visibles par le navigateur.
    *   **Procédure de vérification** :
        1.  Va sur [app.supabase.com](https://app.supabase.com) et ouvre ton projet.
        2.  Dans le menu de gauche, clique sur l'icône **"Edge Functions"** (ressemble à un cube avec des flèches).
        3.  Clique sur une de tes fonctions, par exemple `purchase-phone-number`.
        4.  En haut, clique sur l'onglet **"Settings"**.
        5.  Tu devrais voir une section **"Secrets"**. C'est ICI, et uniquement ici, que tes clés `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `ELEVEN_API_KEY` doivent être stockées.
        6.  **Contre-vérification** : Ouvre ton fichier `.env.local` dans ton projet Next.js. Assure-toi qu'aucune de ces clés n'y figure.

---

### Phase 5 : Business et Finalisation (PR10 & PR11) - **DÉTAILLÉE**

1.  **Intégrer Stripe & Resend (PR10)** :
    *   **Logique des Webhooks** : Un webhook est une URL de ton application que Stripe peut appeler pour te notifier d'un événement.
        *   **Exemple** : Un utilisateur paie son abonnement sur Stripe. Stripe envoie automatiquement une requête à ton URL `/api/stripe/webhook`. Le code que tu as mis dans ce fichier (`src/app/api/stripe/webhook/route.ts`) se déclenche, vérifie que la requête vient bien de Stripe, puis met à jour ta base de données (par exemple, `UPDATE users SET plan = 'premium' WHERE id = ...`).
    *   **Action** : Pour cette partie, suis principalement la documentation du boilerplate `CodeGuide-starter` s'il en a une, car c'est une de ses fonctionnalités. Le stub fourni est juste un point de départ.

2.  **Agent Python (PR11)** :
    *   **Clarification** : Pense à ton projet comme étant deux applications indépendantes :
        1.  **Le site web (Next.js)** : ce que les utilisateurs voient et cliquent.
        2.  **L'assistant vocal (Python)** : un "robot" qui attend des appels téléphoniques.
    *   Ces deux applications ne se parlent pas directement. Elles communiquent via la base de données Supabase. Le site web écrit la configuration de l'assistant dans la base de données, et l'agent Python la lit depuis cette même base de données quand un appel arrive.
    *   **Action** :
        1.  Ouvre un **nouveau terminal**, séparé de celui qui fait tourner ton site Next.js.
        2.  Assure-toi d'être dans le dossier racine de ton projet (`zora-call-booker`).
        3.  Vérifie que le fichier `.env` (pas `.env.local` !) à la racine contient les clés pour l'agent : `LIVEKIT_*`, `OPENAI_API_KEY`, `DEEPGRAM_API_KEY`, etc.
        4.  Lance l'agent avec `python zora_agent.py start`. Il va se mettre en attente, prêt à travailler.
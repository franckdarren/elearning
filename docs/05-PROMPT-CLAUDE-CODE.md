# PROMPT POUR CLAUDE CODE

## Comment utiliser ce dossier

Les 5 fichiers de specs sont dans le dossier `/docs` à la racine du repo. Ouvre Claude Code dans ce repo et colle le prompt ci-dessous.

---

## Prompt maître à coller dans Claude Code

```
Tu vas développer "La-Passerelle Du Savoir", une plateforme LMS de diffusion
de cours en ligne. Toutes les spécifications sont dans les fichiers /docs :
01-ARCHITECTURE.md, 02-DATABASE.md, 03-FEATURES.md, 04-UI-UX.md.

Lis ces 4 fichiers en entier avant de commencer.

Stack imposée : Next.js 14 (App Router) + TypeScript strict + Tailwind + shadcn/ui,
Drizzle ORM, Supabase (Postgres, Auth, Storage, Realtime), Zod (validation),
sonner (toasts), déploiement Vercel + Supabase Cloud.

Règles non négociables :
- La sécurité d'accès repose sur le Row Level Security Postgres, pas seulement
  sur le front. Implémente toutes les policies décrites dans 02-DATABASE.md.
- La correction des QCM et la génération des URLs signées vidéo se font
  côté serveur avec le service role key, jamais côté client.
- L'appartenance d'un élève à une classe ne donne PAS accès à toutes les
  matières : l'accès matière est individuel (table student_subject_access).
- Les contenus ne sont visibles par l'élève que s'ils sont publiés.
- Abstrais les providers de stockage (lib/storage/video-provider.ts et
  document-provider.ts) pour permettre une migration future vers Cloudflare
  Stream sans réécrire le reste.

Procède par étapes, et arrête-toi après chaque étape pour que je valide :

ÉTAPE 1 — Init projet
  - Crée le projet Next.js + TypeScript strict + Tailwind + shadcn/ui.
  - Installe Drizzle ORM + drizzle-kit + postgres-js + zod + sonner.
  - Mets en place la structure de dossiers de 01-ARCHITECTURE.md.
  - Configure les clients Supabase (server, browser, middleware), le client
    Drizzle (lib/db/index.ts), drizzle.config.ts et le .env.example.

ÉTAPE 2 — Base de données
  - Écris le schéma Drizzle complet dans lib/db/schema.ts (enums, tables)
    d'après 02-DATABASE.md.
  - Génère les migrations avec `drizzle-kit generate` dans /supabase/migrations.
  - Écris à la main un fichier /supabase/migrations/rls.sql contenant la
    fonction user_role et toutes les RLS policies (non gérées par Drizzle).
  - Crée les buckets storage (videos, documents, thumbnails).
  - Fournis un seed.sql minimal (1 admin, 1 année scolaire, quelques classes/matières).

ÉTAPE 3 — Auth & rôles
  - Login, reset password, déconnexion.
  - Middleware de protection des routes par rôle.
  - Redirection vers le bon dashboard selon le rôle.

ÉTAPE 4 — Espace Admin
  - CRUD users (gestionnaires, enseignants, élèves), classes, matières, années.
  - Affectations : enseignants ↔ (classe+matière), élèves ↔ classe + matières autorisées.
  - Dashboard admin avec les indicateurs.

ÉTAPE 5 — Espace Enseignant
  - CRUD chapitres, séquences (facultatives), vidéos, documents.
  - Upload vers buckets privés + statut/programmation.
  - Constructeur de QCM.
  - Consultation des résultats.

ÉTAPE 6 — Espace Élève
  - Navigation matières autorisées → chapitre → ressources.
  - Lecteur vidéo sécurisé, consultation/téléchargement docs.
  - Passage des QCM + correction serveur + corrigé + historique.
  - Suivi de progression.

ÉTAPE 7 — Espace Gestionnaire
  - Classes, matières, affectations, programmation, stats de périmètre.

ÉTAPE 8 — Transverse
  - Notifications internes (Realtime) + déclencheurs.
  - Cron de publication/fermeture automatique (Vercel Cron ou pg_cron).
  - Journalisation optionnelle, états de chargement/vides, toasts.

Ne pas implémenter (phase 2) : IA pédagogique, messagerie interne, dépôt de
devoirs, bulletins, classes virtuelles. Garde le schéma extensible.

Commence par l'ÉTAPE 1 et attends ma validation avant l'étape suivante.
```

---

## Conseils d'utilisation

- **Valide étape par étape.** Ne laisse pas Claude Code tout faire d'un coup : tu garderas le contrôle et la qualité.
- **Crée d'abord ton projet Supabase** sur supabase.com, récupère l'URL + les clés, et mets-les dans `.env.local` avant l'étape 3.
- **Teste les RLS tôt** : crée un élève de test et vérifie qu'il ne voit que ses matières.
- **Pour la vidéo en dev**, 1 GB de stockage suffit pour quelques tests. Surveille le quota.

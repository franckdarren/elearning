# La-Passerelle Du Savoir

Plateforme LMS (Learning Management System) permettant la diffusion sécurisée de cours en ligne (vidéos, documents, QCM), organisés par classes et matières, avec accès personnalisé par élève.

## Stack

Next.js 14 (App Router) · TypeScript strict · Tailwind CSS · shadcn/ui · Drizzle ORM · Supabase (PostgreSQL, Auth, Storage, Realtime) · Zod · sonner · Vercel.

## Rôles utilisateurs

`admin` · `manager` · `teacher` · `student` — accès cloisonné par Row Level Security Postgres.

## Documentation

Toutes les spécifications du projet sont dans le dossier [`/docs`](./docs/) :

| Fichier | Contenu |
|---|---|
| [01-ARCHITECTURE.md](./docs/01-ARCHITECTURE.md) | Stack, structure des dossiers, conventions, variables d'env |
| [02-DATABASE.md](./docs/02-DATABASE.md) | Schéma SQL, enums, RLS policies, buckets storage |
| [03-FEATURES.md](./docs/03-FEATURES.md) | Fonctionnalités détaillées par rôle |
| [04-UI-UX.md](./docs/04-UI-UX.md) | Routes, parcours utilisateur, dashboards |
| [05-PROMPT-CLAUDE-CODE.md](./docs/05-PROMPT-CLAUDE-CODE.md) | Prompt maître pour développer avec Claude Code |

Voir aussi [CLAUDE.md](./CLAUDE.md) — règles de code lues automatiquement par Claude Code à chaque session.

## Variables d'environnement

Copier `.env.example` vers `.env.local` puis remplir :

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # serveur uniquement, jamais exposé au client
DATABASE_URL=                   # connexion directe Postgres pour Drizzle
CRON_SECRET=                    # protège les routes /api/cron/*
```

## Démarrage

```bash
# 1. Installer les dépendances
npm install

# 2. Générer et appliquer les migrations Drizzle
npx drizzle-kit generate
npx drizzle-kit migrate

# 3. Appliquer les RLS policies (SQL manuel)
# Exécuter /supabase/migrations/rls.sql sur ton projet Supabase

# 4. Lancer le serveur de développement
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Sécurité — règles non négociables

- RLS activé sur toutes les tables.
- Correction des QCM **côté serveur uniquement** (jamais d'`is_correct` envoyé au client avant soumission).
- URLs vidéo signées **côté serveur uniquement** (buckets privés, durée max 1 h).
- L'accès matière d'un élève est **individuel** (table `student_subject_access`), pas hérité de sa classe.
- Contenu visible par l'élève uniquement si `status = 'published'` et dans la fenêtre `published_at` / `unpublish_at`.

Voir [CLAUDE.md §6](./CLAUDE.md) pour le détail.

## Déploiement

Vercel (front + cron) + Supabase Cloud (DB + Auth + Storage + Realtime).

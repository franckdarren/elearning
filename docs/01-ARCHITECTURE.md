# ARCHITECTURE — La-Passerelle Du Savoir

## 1. Vue d'ensemble

Plateforme LMS (Learning Management System) permettant la diffusion sécurisée de cours en ligne (vidéos, documents, QCM), organisés par classes et matières, avec accès personnalisé par élève.

## 2. Stack technique

| Couche | Technologie | Version | Plan (dev) |
|---|---|---|---|
| Framework | Next.js (App Router) | 14+ | — |
| Langage | TypeScript (strict) | 5+ | — |
| UI | Tailwind CSS + shadcn/ui | — | — |
| ORM | Drizzle ORM | — | — |
| Base de données | Supabase PostgreSQL | — | Free |
| Authentification | Supabase Auth | — | Free |
| Stockage fichiers | Supabase Storage | — | Free (1 GB) |
| Realtime/Notifications | Supabase Realtime | — | Free |
| Validation | Zod | — | — |
| Toasts | sonner | — | — |
| Déploiement front | Vercel | — | Free |
| Backend | Supabase Cloud | — | Free |

## 3. Principes d'architecture

- **Server-first** : privilégier les Server Components et Server Actions. Le client ne reçoit que ce dont il a besoin.
- **Sécurité par la base** : la logique d'accès repose sur le Row Level Security (RLS) de Postgres, jamais uniquement sur le front.
- **Providers de stockage abstraits** : créer une couche d'abstraction `lib/storage/video-provider.ts` et `lib/storage/document-provider.ts` pour pouvoir migrer de Supabase Storage vers Cloudflare Stream / Mux plus tard sans toucher au reste du code.
- **Rôles** : 4 rôles (`admin`, `manager`, `teacher`, `student`) gérés via une table `profiles` + claims, et appliqués via RLS et middleware.

## 4. Structure des dossiers

```
/app
  /(auth)
    /login
    /reset-password
  /(admin)
    /dashboard
    /users          # gestion gestionnaires, enseignants, élèves
    /classes
    /subjects       # matières
    /assignments    # affectations enseignants/élèves
    /settings
  /(manager)
    /dashboard
    /classes
    /subjects
    /assignments
    /scheduling
  /(teacher)
    /dashboard
    /content        # chapitres, séquences, vidéos, docs
    /quizzes
    /results
  /(student)
    /dashboard
    /subjects
    /subjects/[subjectId]
    /chapter/[chapterId]
    /quiz/[quizId]
    /results
  /api              # route handlers (webhooks, cron)
/components
  /ui               # shadcn (ne pas modifier manuellement)
  /shared
  /admin /manager /teacher /student
/lib
  /db
    index.ts        # client Drizzle
    schema.ts       # schéma Drizzle complet
  /supabase         # clients Supabase (server, browser, middleware)
  /storage          # abstraction vidéo/documents
  /auth             # helpers rôles & permissions
  /validations      # schémas Zod
/supabase
  /migrations       # SQL versionnés (drizzle-kit generate + RLS manuelles)
  seed.sql
middleware.ts
drizzle.config.ts
```

## 5. Conventions

- **Validation** : tout input utilisateur validé avec Zod côté serveur.
- **Nommage BD** : tables et colonnes en `snake_case`, pluriel pour les tables.
- **Dates** : stockées en `timestamptz` (UTC), converties à l'affichage.
- **IDs** : `uuid` partout (défaut `gen_random_uuid()`).
- **Types** : utiliser les types inférés par Drizzle depuis `lib/db/schema.ts` — pas de `any`.

## 6. Variables d'environnement

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # serveur uniquement, jamais exposé au client
DATABASE_URL=                   # connexion directe Postgres pour Drizzle
CRON_SECRET=                    # protège les routes /api/cron/*
```

## 7. Stockage (buckets Supabase)

3 buckets :
- `videos` — **privé**. Accès via signed URLs serveur uniquement.
- `documents` — **privé**. Accès via signed URLs serveur uniquement.
- `thumbnails` — **public**. Miniatures non sensibles.

## 8. Stratégie vidéo (dev → prod)

- **Dev** : upload vers le bucket privé `videos` de Supabase Storage. Accès via URLs signées à durée limitée (max 1 h) générées côté serveur — jamais d'URL publique directe.
- **Prod** : prévoir migration vers Cloudflare Stream (HLS + signed tokens) en n'ayant à réécrire que le provider `lib/storage/video-provider.ts`.

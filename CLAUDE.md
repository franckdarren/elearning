# CLAUDE.md — La-Passerelle Du Savoir

Ce fichier est lu automatiquement par Claude Code à chaque session.
Il contient toutes les instructions, conventions et règles du projet.

---

## 1. Présentation du projet

**La-Passerelle Du Savoir** est une plateforme LMS (Learning Management System)
permettant la diffusion sécurisée de cours en ligne (vidéos, documents, QCM),
organisés par classes et matières, avec accès personnalisé par élève.

Les spécifications complètes sont dans `/docs` :
- `01-ARCHITECTURE.md` — Stack, structure, conventions
- `02-DATABASE.md` — Schéma, RLS, buckets
- `03-FEATURES.md` — Fonctionnalités par rôle
- `04-UI-UX.md` — Routes, parcours, dashboards
- `05-PROMPT-CLAUDE-CODE.md` — Prompt maître étape par étape
- `06-ROADMAP.md` — Roadmap détaillée par phase (tâches, livrables, critères de validation)

---

## 2. Stack technique

| Couche | Technologie |
|---|---|
| Framework | Next.js 14 — App Router |
| Langage | TypeScript strict |
| UI | Tailwind CSS + shadcn/ui |
| ORM | Drizzle ORM |
| Base de données | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Stockage | Supabase Storage (buckets privés) |
| Realtime | Supabase Realtime |
| Validation | Zod |
| Déploiement | Vercel + Supabase Cloud |

---

## 3. Structure des dossiers

```
/app
  /(auth)/login
  /(auth)/reset-password
  /(admin)/dashboard
  /(admin)/users
  /(admin)/classes
  /(admin)/subjects
  /(admin)/assignments
  /(admin)/settings
  /(manager)/dashboard
  /(manager)/classes
  /(manager)/subjects
  /(manager)/assignments
  /(manager)/scheduling
  /(teacher)/dashboard
  /(teacher)/content
  /(teacher)/quizzes
  /(teacher)/results
  /(student)/dashboard
  /(student)/subjects
  /(student)/subjects/[subjectId]
  /(student)/chapter/[chapterId]
  /(student)/quiz/[quizId]
  /(student)/results
  /api                        ← route handlers (webhooks, cron)
/components
  /ui                         ← shadcn (ne pas modifier manuellement)
  /shared                     ← composants partagés entre rôles
  /admin
  /manager
  /teacher
  /student
/lib
  /db
    index.ts                  ← client Drizzle
    schema.ts                 ← schéma Drizzle complet
  /supabase
    server.ts                 ← client Supabase SSR (Server Components)
    client.ts                 ← client Supabase (Browser)
    middleware.ts             ← client Supabase (Middleware)
  /storage
    video-provider.ts         ← abstraction provider vidéo
    document-provider.ts
  /auth
    permissions.ts            ← helpers rôles
  /validations                ← schémas Zod
/supabase
  /migrations                 ← SQL versionnés (drizzle-kit generate)
  seed.sql
middleware.ts
drizzle.config.ts
```

---

## 4. Variables d'environnement

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # jamais exposé côté client
DATABASE_URL=                   # connexion directe Postgres pour Drizzle
```

---

## 5. Rôles utilisateurs

4 rôles : `admin`, `manager`, `teacher`, `student`

Définis dans l'enum Drizzle/Postgres `user_role` et stockés dans la table `profiles`.

| Rôle | Accès |
|---|---|
| `admin` | Tout |
| `manager` | Classes, matières, affectations, contenus de son périmètre |
| `teacher` | Contenus de ses (classe+matière) assignées uniquement |
| `student` | Ses matières autorisées + contenus publiés uniquement |

---

## 6. Règles de sécurité — NON NÉGOCIABLES

1. **RLS activé sur toutes les tables.** La sécurité d'accès repose sur le Row Level Security Postgres, pas uniquement sur le front.

2. **Correction des QCM côté serveur uniquement.** Utiliser le `service_role_key` dans une Server Action. Ne jamais envoyer `is_correct` au client avant soumission du quiz.

3. **URLs vidéo signées côté serveur uniquement.** Les vidéos sont dans un bucket privé. Génère les signed URLs dans une Server Action ou un Route Handler avec le `service_role_key`. Durée maximale : 1 heure.

4. **Accès matière individuel.** L'appartenance d'un élève à une classe ne donne PAS accès à toutes les matières de cette classe. L'accès est géré par la table `student_subject_access`.

5. **Contenu visible par l'élève seulement si `status = 'published'`** et `published_at <= now()` et (`unpublish_at IS NULL` OR `unpublish_at > now()`).

6. **`SUPABASE_SERVICE_ROLE_KEY` uniquement côté serveur.** Ne jamais l'importer dans un composant Client ou l'exposer dans une variable `NEXT_PUBLIC_*`.

---

## 7. Conventions de code

### TypeScript
- Mode `strict` activé dans `tsconfig.json`.
- Pas de `any`. Utiliser les types générés par Drizzle.
- Préférer `type` à `interface` pour les types de données.

### Drizzle ORM
- Schéma dans `lib/db/schema.ts` — un seul fichier.
- Client dans `lib/db/index.ts` :
  ```ts
  import { drizzle } from "drizzle-orm/postgres-js";
  import postgres from "postgres";
  import * as schema from "./schema";

  const client = postgres(process.env.DATABASE_URL!);
  export const db = drizzle(client, { schema });
  ```
- Les queries se font côté serveur uniquement (Server Actions, Server Components, Route Handlers).
- Les migrations sont générées avec `drizzle-kit generate` et appliquées avec `drizzle-kit migrate`.

### Next.js
- Privilégier les **Server Components** par défaut. Ajouter `"use client"` seulement si nécessaire (interactivité, hooks).
- Utiliser les **Server Actions** pour toutes les mutations (formulaires, upload, correction QCM…).
- Pas de `useEffect` pour fetcher des données — utiliser `async/await` dans les Server Components.

### Validation
- Tout input utilisateur validé avec **Zod** côté serveur dans la Server Action.
- Schémas dans `/lib/validations/`.

### Nommage
- Tables et colonnes Postgres : `snake_case`, pluriel pour les tables.
- Fichiers et dossiers : `kebab-case`.
- Composants React : `PascalCase`.
- Fonctions et variables : `camelCase`.

### Dates
- Stockées en `timestamptz` (UTC) dans Postgres.
- Converties côté client pour l'affichage selon le fuseau local.

---

## 8. Base de données — points clés Drizzle

### Enums à déclarer
```ts
export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "teacher", "student"]);
export const contentStatusEnum = pgEnum("content_status", ["draft", "scheduled", "published", "archived"]);
export const resourceTypeEnum = pgEnum("resource_type", ["video", "document"]);
export const documentAccessEnum = pgEnum("document_access", ["downloadable", "view_only"]);
export const questionTypeEnum = pgEnum("question_type", ["single", "multiple", "true_false"]);
export const notificationTypeEnum = pgEnum("notification_type", ["new_course","new_document","new_quiz","quiz_reminder","scheduled_published"]);
```

### Tables principales
Voir `docs/02-DATABASE.md` pour le schéma SQL complet.
Tables : `profiles`, `academic_years`, `classes`, `subjects`, `class_subjects`,
`teacher_assignments`, `student_enrollments`, `student_subject_access`,
`chapters`, `sequences`, `resources`, `quizzes`, `questions`, `question_options`,
`quiz_attempts`, `quiz_answers`, `progress`, `notifications`, `activity_logs`.

### RLS
Les policies RLS sont écrites en SQL pur dans les migrations (Drizzle ne génère pas les RLS).
Créer un fichier `/supabase/migrations/rls.sql` séparé pour toutes les policies.

---

## 9. Supabase Storage

3 buckets :
- `videos` → **privé**. Accès via signed URLs serveur uniquement.
- `documents` → **privé**. Accès via signed URLs serveur uniquement.
- `thumbnails` → **public**. Miniatures non sensibles.

Abstraction provider dans `lib/storage/video-provider.ts` :
```ts
export interface VideoProvider {
  upload(file: File, path: string): Promise<string>;
  getSignedUrl(path: string, expiresIn?: number): Promise<string>;
  delete(path: string): Promise<void>;
}
```
Implémenter `SupabaseVideoProvider` qui respecte cette interface.
Cela permettra de migrer vers Cloudflare Stream en prod sans toucher au reste.

---

## 10. Publication automatique (Cron)

Utiliser un **Vercel Cron Job** toutes les 5 minutes (`/app/api/cron/publish/route.ts`) :
- Passer `resources` et `quizzes` de `scheduled` → `published` quand `published_at <= now()`.
- Archiver les ressources dont `unpublish_at <= now()`.
- Fermer les quiz dont `closes_at <= now()`.
- Créer les notifications correspondantes.
- Sécuriser la route avec un header `Authorization: Bearer CRON_SECRET`.

```bash
# .env.local
CRON_SECRET=une_chaine_aleatoire_longue
```

---

## 11. Notifications

- Stockées dans la table `notifications`.
- Diffusion temps réel via **Supabase Realtime** (channel par `user_id`).
- Composant cloche dans le header : badge + dropdown des notifications non lues.
- Marquer comme lues au clic.

---

## 12. Ordre de développement recommandé

1. Init projet + structure dossiers + config (Drizzle, Supabase clients, middleware)
2. Schéma Drizzle complet + migrations SQL + RLS + seed
3. Auth (login, reset, middleware de protection des routes, redirection par rôle)
4. Espace Admin (users, classes, matières, affectations, dashboard)
5. Espace Enseignant (chapitres, séquences, vidéos, documents, QCM, résultats)
6. Espace Élève (navigation, lecteur vidéo, QCM, progression)
7. Espace Gestionnaire (classes, matières, affectations, programmation, stats)
8. Transverse (notifications Realtime, cron publication, logs)

---

## 13. Hors périmètre (Phase 2 — ne pas implémenter)

- Assistant IA pédagogique
- Messagerie interne
- Dépôt de devoirs
- Génération de bulletins de notes
- Classes virtuelles en direct

Garder le schéma extensible pour ces fonctionnalités futures.

---

## 14. Interface

- Langue : **français** pour tous les textes de l'interface.
- Composants : shadcn/ui uniquement (ne pas mélanger avec d'autres librairies UI).
- États de chargement : skeletons sur toutes les listes.
- États vides : messages explicites ("Aucune matière autorisée pour le moment").
- Actions : toasts de confirmation via `sonner` (pas `toast` qui est déprécié).
- Suppressions : toujours demander confirmation via `Dialog` avant de supprimer.
- Responsive : mobile + desktop.

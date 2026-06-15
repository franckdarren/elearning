# ROADMAP — La-Passerelle Du Savoir

Plan d'implémentation complet, du projet vide à la mise en production.
Chaque phase liste : **objectif**, **tâches**, **livrables**, **critères de validation** et **dépendances**.

> Estimations en jours-développeur (j-d) pour 1 dev full-time expérimenté.
> Total ≈ **40–55 j-d**.

---

## Vue d'ensemble

| # | Phase | Durée | Bloque |
|---|---|---|---|
| 0 | Setup & fondations | 1–2 j | tout |
| 1 | Base de données & RLS | 4–5 j | toutes les phases métier |
| 2 | Auth & routing | 2–3 j | 3, 4, 5, 6 |
| 3 | Espace Admin | 5–7 j | 6 (partiel) |
| 4 | Espace Enseignant | 6–8 j | 5 (contenu) |
| 5 | Espace Élève | 6–8 j | — |
| 6 | Espace Gestionnaire | 3–4 j | — |
| 7 | Transverse (Realtime, cron, notifications) | 4–5 j | 8 |
| 8 | QA, sécurité, déploiement | 4–6 j | livraison |

---

## Phase 0 — Setup & fondations (1–2 j)

### Objectif
Avoir un projet Next.js qui démarre, avec tous les outils installés et la structure de dossiers en place.

### Tâches
- [ ] `create-next-app` (Next.js 14, TypeScript strict, Tailwind, App Router, src/ non).
- [ ] Installer dépendances :
  - `drizzle-orm`, `drizzle-kit`, `postgres`
  - `@supabase/supabase-js`, `@supabase/ssr`
  - `zod`, `sonner`
  - `shadcn-ui` (init + composants de base : button, input, card, dialog, table, dropdown-menu, skeleton, badge, toast/sonner)
- [ ] Créer la structure de dossiers de [01-ARCHITECTURE.md §4](./01-ARCHITECTURE.md#4-structure-des-dossiers).
- [ ] Configurer `tsconfig.json` en strict.
- [ ] Configurer `drizzle.config.ts`.
- [ ] Créer le projet Supabase Cloud (free plan).
- [ ] Créer `.env.local` et `.env.example` avec les 5 variables ([CLAUDE.md §4](../CLAUDE.md)).
- [ ] Configurer ESLint + Prettier.
- [ ] Initialiser le repo Git + premier commit.

### Livrables
- Projet Next.js qui démarre sur `localhost:3000`.
- Dossier `lib/` structuré.
- `.env.example` complet.

### Critères de validation
- `npm run dev` fonctionne.
- `npm run build` passe sans erreur.
- `npx drizzle-kit check` ne crashe pas.

---

## Phase 1 — Base de données, schéma & RLS (4–5 j)

### Objectif
Schéma Drizzle complet, migrations appliquées, RLS testées, seed minimal.

### Tâches

**Drizzle schema** (`lib/db/schema.ts`)
- [ ] Déclarer les 6 enums ([CLAUDE.md §8](../CLAUDE.md)).
- [ ] Déclarer les 17 tables ([02-DATABASE.md §3](./02-DATABASE.md)) avec foreign keys, défauts, contraintes uniques.
- [ ] Exporter les types inférés (`type Profile = typeof profiles.$inferSelect`).

**Client Drizzle** (`lib/db/index.ts`)
- [ ] Instancier `drizzle(postgres(DATABASE_URL), { schema })`.

**Migrations**
- [ ] `npx drizzle-kit generate` → SQL dans `/supabase/migrations/0001_init.sql`.
- [ ] Créer manuellement `/supabase/migrations/0002_rls.sql` contenant :
  - fonction `public.user_role()` (security definer)
  - `alter table X enable row level security` pour chaque table
  - toutes les policies de [02-DATABASE.md §5](./02-DATABASE.md#5-row-level-security-principes)
- [ ] `npx drizzle-kit migrate` puis appliquer `0002_rls.sql` via psql ou dashboard Supabase.

**Storage**
- [ ] Créer les 3 buckets (`videos` privé, `documents` privé, `thumbnails` public) via SQL ou dashboard.
- [ ] Policies storage : seul le service role uploade ; lecture publique sur `thumbnails`.

**Seed** (`/supabase/seed.sql`)
- [ ] 1 admin (avec auth.users + profiles).
- [ ] 1 academic_year courante.
- [ ] 2–3 classes + 3–4 subjects + class_subjects.
- [ ] 1 teacher + 1 student avec assignments/enrollments/student_subject_access.

### Livrables
- `lib/db/schema.ts` complet.
- `/supabase/migrations/` versionné.
- Seed reproductible.

### Critères de validation
- Toutes les tables visibles dans Supabase Studio.
- **Test RLS manuel** (via SQL editor en `set role authenticated; set request.jwt.claims = ...`) :
  - Un élève lit ses matières autorisées et **rien d'autre**.
  - Un enseignant lit les chapitres de ses (classe+matière) uniquement.
  - L'admin lit tout.
- `drizzle-kit check` propre.

---

## Phase 2 — Auth & routing (2–3 j)

### Objectif
Login / logout / reset fonctionnels, middleware qui protège les routes par rôle, redirection automatique.

### Tâches

**Clients Supabase** (`lib/supabase/`)
- [ ] `server.ts` — `createServerClient` SSR.
- [ ] `client.ts` — `createBrowserClient`.
- [ ] `middleware.ts` — `createMiddlewareClient`.

**Pages auth**
- [ ] `/login` — formulaire email/password + Server Action `signIn`.
- [ ] `/reset-password` — demande de reset + page de nouveau mot de passe.
- [ ] Logout — Server Action `signOut` accessible depuis le header.

**Middleware racine** (`middleware.ts`)
- [ ] Refresh de session sur chaque requête.
- [ ] Lecture du `role` depuis `profiles`.
- [ ] Mapping route group → rôle requis :
  - `/admin/*` → `admin`
  - `/manager/*` → `admin | manager`
  - `/teacher/*` → `admin | teacher`
  - `/student/*` → `student`
- [ ] Redirection `/login` si non authentifié.
- [ ] Redirection vers dashboard du bon rôle si rôle insuffisant.

**Helpers** (`lib/auth/permissions.ts`)
- [ ] `getCurrentUser()`, `requireRole(role[])`, `redirectToDashboard(role)`.

### Livrables
- Auth fonctionnelle end-to-end.
- Middleware testé avec les 4 rôles.

### Critères de validation
- Login admin → `/admin/dashboard`.
- Login student → `/student/dashboard`.
- Tentative student d'accès à `/admin/*` → redirigé.
- Reset password reçu par email (Supabase Auth).
- Pas de fuite de session côté client.

---

## Phase 3 — Espace Admin (5–7 j)

### Objectif
CRUD complet utilisateurs / classes / matières / années / affectations + dashboard global.

### Tâches

**Layout & navigation**
- [ ] `app/(admin)/layout.tsx` — sidebar + header + cloche notif (placeholder).

**Dashboard** (`/admin/dashboard`)
- [ ] KPIs : nb élèves, enseignants, gestionnaires, classes, matières, vidéos, QCM, contenus programmés ([04-UI-UX.md §3](./04-UI-UX.md#3-dashboards-indicateurs)).
- [ ] Requêtes Drizzle côté serveur (Server Component).

**Users** (`/admin/users`)
- [ ] Liste avec filtre par rôle, pagination, recherche.

- [ ] Création = Server Action qui appelle `supabase.auth.admin.inviteUserByEmail` (service role) + insert dans `profiles`.
- [ ] Edit (nom, rôle, is_active).
- [ ] Soft delete (toggle `is_active`).
- [ ] Schéma Zod `lib/validations/user.ts`.

**Classes** (`/admin/classes`)
- [ ] CRUD complet (nom, niveau, year, description).
- [ ] Association `class_subjects` via dialog multi-select.

**Subjects** (`/admin/subjects`)
- [ ] CRUD subjects.
- [ ] Vue des classes où la matière est proposée.

**Academic years** (intégré à `/admin/settings` ou page dédiée)
- [ ] CRUD + flag `is_current` exclusif (UNIQUE INDEX WHERE).

**Assignments** (`/admin/assignments`)
- [ ] **Onglet enseignants** : assigner teacher → (class + subject). Tableau `teacher_assignments`.
- [ ] **Onglet élèves** : inscrire student → class (`student_enrollments`), puis cocher les matières autorisées (`student_subject_access`).
- [ ] UI : recherche élève → vue détaillée avec ses matières.

**Settings** (`/admin/settings`)
- [ ] Année scolaire courante, paramètres généraux.

### Livrables
- Toutes les pages `/admin/*` opérationnelles.
- Toutes les mutations passent par Server Actions + Zod.

### Critères de validation
- Créer un enseignant, l'affecter à (3ème A + Maths), puis se logger en tant que cet enseignant → il voit la classe dans son dashboard.
- Créer un élève, lui donner accès à Maths seulement → il ne voit pas Histoire même si Histoire est proposée à sa classe.
- Aucune erreur RLS dans les logs Supabase.

---

## Phase 4 — Espace Enseignant (6–8 j)

### Objectif
L'enseignant gère ses chapitres, séquences, vidéos, documents, QCM sur son périmètre (classes+matières assignées).

### Tâches

**Layout & dashboard**
- [ ] `/teacher/dashboard` — KPIs périmètre + raccourcis vers ses (classe+matière).

**Content tree** (`/teacher/content`)
- [ ] Sélecteur (classe + matière) parmi ses assignments.
- [ ] Arbre chapitres → séquences (optionnelles) → ressources.
- [ ] Drag & drop pour réordonner (`position`).

**Chapitres**
- [ ] CRUD chapitres dans (classe+matière) sélectionnée.

**Séquences** (facultatives)
- [ ] CRUD séquences sous chapitre.

**Resources vidéo**
- [ ] `/teacher/content/[chapterId]/new-video` — formulaire.
- [ ] **Upload** : provider `lib/storage/video-provider.ts` → bucket `videos` (privé).
- [ ] Génération de thumbnail (upload séparé bucket `thumbnails`).
- [ ] Champs : titre, description, durée, auteur, statut, `published_at`, `unpublish_at`.
- [ ] Composant uploader avec progress + chunk si > 100 MB.

**Resources document**
- [ ] Upload vers `documents` (privé) via `document-provider.ts`.
- [ ] Choix `document_access` (downloadable / view_only).

**Quizzes** (`/teacher/quizzes`)
- [ ] CRUD quizzes (titre, durée, max_attempts, opens_at, closes_at, chapter associé).
- [ ] `/teacher/quizzes/[quizId]/edit` — constructeur :
  - Ajout questions (single / multiple / true_false).
  - Pour chaque question : options + marqueurs `is_correct`.
  - Réordonnancement (`position`).
- [ ] Validation Zod stricte.

**Résultats** (`/teacher/results`)
- [ ] Liste des `quiz_attempts` sur son périmètre.
- [ ] Détail d'une tentative + corrigé.
- [ ] Stats par quiz : taux de réussite, distribution des scores.

### Livrables
- Upload vidéo et document fonctionnel vers buckets privés.
- Constructeur de QCM complet.
- Provider abstrait respectant l'interface ([CLAUDE.md §9](../CLAUDE.md)).

### Critères de validation
- Un enseignant ne peut PAS écrire de chapitre sur une (classe+matière) qu'il n'a pas (vérifié par RLS).
- Le fichier vidéo uploadé n'est PAS accessible par URL directe — seulement signed URL.
- Un quiz `draft` n'apparaît pas côté élève.

---

## Phase 5 — Espace Élève (6–8 j)

### Objectif
L'élève consomme ses matières autorisées, regarde les vidéos via signed URL, passe les QCM, voit sa progression.

### Tâches

**Layout & dashboard**
- [ ] `/student/dashboard` — progression globale + matière + historique récent.

**Subjects** (`/student/subjects`)
- [ ] Liste des matières autorisées (jointure `student_subject_access`).
- [ ] État vide : "Aucune matière autorisée pour le moment".

**Subject detail** (`/student/subjects/[subjectId]`)
- [ ] Liste des chapitres de la matière, filtrés par `published`.

**Chapter detail** (`/student/chapter/[chapterId]`)
- [ ] Séquences + ressources publiées uniquement.
- [ ] Badge "Nouveau" si publié depuis < 7 jours.

**Lecteur vidéo sécurisé**
- [ ] Server Action `getVideoSignedUrl(resourceId)` qui :
  1. Vérifie via RLS que l'élève a accès.
  2. Génère signed URL via service role (TTL 1h).
- [ ] Composant `<SecureVideoPlayer>` : pas de bouton download natif, contextmenu désactivé.
- [ ] Tracking de progression : `watched_seconds` via debounce.
- [ ] Marqueur `watched=true` à 90% visionné.

**Document viewer**
- [ ] Signed URL pareil.
- [ ] Si `view_only` : iframe PDF.js sans bouton download.
- [ ] Si `downloadable` : bouton télécharger.

**Quiz** (`/student/quiz/[quizId]`)
- [ ] Vérifs serveur : ouvert, dans la fenêtre, tentatives restantes.
- [ ] Affichage : questions + options SANS `is_correct`.
- [ ] Timer si `duration_minutes`.
- [ ] Submit → Server Action `submitQuiz` :
  1. Insert `quiz_attempt` + `quiz_answers` (service role).
  2. Calcul du score côté serveur.
  3. Retourne le corrigé.
- [ ] Affichage du corrigé après soumission.

**Results** (`/student/results`)
- [ ] Historique des tentatives + scores.
- [ ] Détail d'une tentative.

### Livrables
- Toutes les pages élève fonctionnelles.
- Signed URLs en place pour vidéo et document.
- Correction QCM 100% côté serveur.

### Critères de validation
- Inspection réseau : aucun `is_correct: true` côté client avant submit.
- Inspection réseau : aucune URL signée valide après 1h.
- Élève sans `student_subject_access` ne peut PAS forcer l'URL `/student/subjects/[id]` (404 ou redirect).
- Progression incrémente correctement.

---

## Phase 6 — Espace Gestionnaire (3–4 j)

### Objectif
Le gestionnaire fait un sous-ensemble du travail de l'admin, sur son périmètre.

### Tâches
- [ ] `/manager/dashboard` — KPIs périmètre.
- [ ] `/manager/classes` — lecture + édition limitée.
- [ ] `/manager/subjects`.
- [ ] `/manager/assignments` — affectations enseignants / élèves.
- [ ] `/manager/scheduling` — vue d'ensemble des contenus `scheduled` + possibilité de modifier dates.

> Beaucoup de composants partagés avec l'admin → factoriser dans `components/shared/`.

### Critères de validation
- Un manager ne peut PAS créer un autre manager ni un admin.
- Périmètre RLS respecté (à définir précisément avec le client : tous les manager voient tout, ou seulement leur périmètre ?).

---

## Phase 7 — Transverse : notifications, cron, logs (4–5 j)

### Objectif
Vivacité de la plateforme : temps réel, publications automatiques, traçabilité.

### Tâches

**Notifications**
- [ ] Composant cloche dans header (badge + dropdown).
- [ ] Subscribe Supabase Realtime sur `notifications` filtré par `user_id`.
- [ ] Server Actions : `markAsRead`, `markAllAsRead`.
- [ ] Insertion de notifications côté serveur quand :
  - Enseignant publie une ressource → notif aux élèves concernés.
  - Quiz ouvre → notif aux élèves.
  - Rappel quiz J-1 fermeture → via cron.

**Cron de publication** (`app/api/cron/publish/route.ts`)
- [ ] Header `Authorization: Bearer CRON_SECRET` obligatoire.
- [ ] Toutes les 5 min (`vercel.json`) :
  1. `UPDATE resources SET status='published' WHERE status='scheduled' AND published_at <= now()`.
  2. `UPDATE resources SET status='archived' WHERE unpublish_at <= now()`.
  3. `UPDATE quizzes SET status='archived' W
  HERE closes_at <= now()`.
  4. Insert notifications correspondantes.
- [ ] Logs en cas d'erreur.

**Activity logs**
- [ ] Wrapper Server Action `logActivity(action, metadata)` à appeler sur événements clés (login, publish, delete).

**UX transversal**
- [ ] Skeleton sur toutes les listes.
- [ ] Empty states avec illustration.
- [ ] Toasts `sonner` partout (success, error).
- [ ] Dialog de confirmation sur tous les `DELETE`.
- [ ] Responsive (mobile testé).

### Critères de validation
- Test bout-en-bout : enseignant publie une vidéo → cloche s'allume chez l'élève en < 5s.
- Cron déclenché manuellement passe un contenu `scheduled` → `published`.
- Aucune action destructive sans confirmation.

---

## Phase 8 — QA, sécurité, déploiement (4–6 j)

### Objectif
Plateforme prête pour production.

### Tâches

**Tests**
- [ ] Tests unitaires sur helpers critiques (`permissions`, calcul de score, signed URL guards).
- [ ] Tests d'intégration RLS (matrice : rôle × table × CRUD) — au moins 1 cas négatif par règle critique.
- [ ] Tests e2e Playwright sur les 4 parcours dashboards (login → action principale).

**Sécurité**
- [ ] Audit : `SUPABASE_SERVICE_ROLE_KEY` n'apparaît nulle part en `NEXT_PUBLIC_*`.
- [ ] Audit : aucun appel Drizzle dans un composant Client.
- [ ] Audit : signed URLs ≤ 1h partout.
- [ ] Headers HTTP de sécurité (CSP, X-Frame-Options, etc.) via `next.config.js`.
- [ ] Rate limiting sur `/login` et `/reset-password` (Vercel ou middleware).

**Performance**
- [ ] Pagination sur toutes les listes (cursor ou offset).
- [ ] Indexes Postgres sur FK et colonnes filtrées (`published_at`, `status`).
- [ ] Lighthouse > 90 sur les dashboards.

**Déploiement**
- [ ] Connecter le repo à Vercel.
- [ ] Configurer variables d'env prod (5 variables).
- [ ] Configurer `vercel.json` avec le cron.
- [ ] Projet Supabase prod séparé du dev (ou branche Supabase).
- [ ] Tester domaine custom.
- [ ] Backups Supabase activés.

**Monitoring**
- [ ] Sentry ou équivalent côté Next.
- [ ] Logs Supabase consultés régulièrement.
- [ ] Alerte si quota storage > 80%.

### Critères de validation
- Tous les tests passent en CI.
- Audit RLS validé : aucune fuite possible entre rôles.
- Déploiement Vercel vert sur le domaine prod.
- Premier utilisateur réel onboardé sans bug bloquant.

---

## Hors périmètre (Phase 2 client — ne pas implémenter)

Voir [03-FEATURES.md §12](./03-FEATURES.md) et [CLAUDE.md §13](../CLAUDE.md) :
- Assistant IA pédagogique
- Messagerie interne
- Dépôt de devoirs
- Bulletins de notes
- Classes virtuelles en direct

Garder le schéma extensible — ne pas casser la compatibilité avec ces ajouts futurs.

---

## Risques & points d'attention

| Risque | Impact | Mitigation |
|---|---|---|
| Quota Supabase Storage (1 GB free) atteint vite avec des vidéos | Bloquant | Limiter taille vidéos en dev, prévoir Cloudflare Stream pour prod (provider déjà abstrait). |
| RLS mal écrites → fuites entre rôles | **Critique** | Matrice de tests dédiée Phase 8, audit indépendant. |
| Drizzle ne gère pas les RLS | Moyen | Fichier `rls.sql` versionné séparément, jamais régénéré par drizzle-kit. |
| Cron Vercel free plan : 1 cron / 24h | Moyen sur free | Free permet 2 crons / jour ; en prod, plan Pro requis pour cron 5 min OU bascule sur `pg_cron` Supabase. |
| Signed URL vidéo interceptée et partagée | Moyen | TTL court (1h max), watermark optionnel en phase 2. |

---

## Ordre de validation client suggéré

Après chaque phase, démo de 15 min au client pour valider avant la suivante. Priorité ordre : 1 → 2 → 3 → 4 → 5 → 7 (partie cron+notif) → 6 → 8.

> Possibilité de paralléliser Phase 5 (élève) et Phase 6 (manager) si 2 devs disponibles, après que Phases 3 + 4 soient stabilisées.

# Déploiement — La-Passerelle Du Savoir

Guide opérationnel pour mettre la plateforme en production sur Vercel + Supabase Cloud.

## 1. Prérequis

- Compte Vercel (plan Hobby suffit pour démarrer; **Pro requis** pour cron toutes les 5 min).
- Projet Supabase Cloud distinct du projet de dev.
- Repo Git connecté.

## 2. Préparation Supabase production

1. Créer un nouveau projet Supabase (région proche des utilisateurs).
2. Récupérer :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**jamais** côté client)
   - Connection string (Connection pooling, mode `session`) → `DATABASE_URL`
3. Appliquer les migrations :
   ```bash
   DATABASE_URL='postgresql://...' npm run db:apply
   ```
   Cela exécute les 4 migrations (`0000_init`, `0001_rls`, `0002_storage`, `0003_realtime`).
4. Créer un premier admin via le dashboard Supabase Auth, puis :
   ```sql
   update public.profiles set role = 'admin' where email = 'admin@…';
   ```
5. Activer les **backups quotidiens** dans Supabase → Database → Backups.

## 3. Variables d'environnement Vercel

Project Settings → Environment Variables, scope "Production" :

| Clé | Source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project Settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Project Settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Project Settings — **encrypted** |
| `DATABASE_URL` | Supabase Connection pooling URI |
| `CRON_SECRET` | générer avec `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `NEXT_PUBLIC_APP_URL` | URL de l'app, ex `https://passerelle.example.com` |
| `NEXT_PUBLIC_APP_NAME` | `La-Passerelle Du Savoir` |

## 4. Domaine custom

1. Vercel → Project → Domains → ajouter le domaine.
2. Configurer le DNS chez le registrar (CNAME ou A record indiqué par Vercel).
3. Mettre à jour `NEXT_PUBLIC_APP_URL` avec l'URL finale.
4. Dans **Supabase → Auth → URL Configuration** :
   - Site URL : `https://passerelle.example.com`
   - Redirect URLs : `https://passerelle.example.com/auth/callback`

## 5. Cron de publication

`vercel.json` à la racine déclare :

```json
{
  "crons": [{ "path": "/api/cron/publish", "schedule": "*/5 * * * *" }]
}
```

- **Plan Hobby (gratuit)** : Vercel dégrade à 1 cron par 24h.
- **Plan Pro** : `*/5 * * * *` honoré.
- **Alternative free** : remplacer par un job `pg_cron` Supabase qui appelle `/api/cron/publish` avec le secret.

## 6. Audits avant chaque déploiement

```bash
npm run audit:security   # checks statiques (NEXT_PUBLIC keys, client+drizzle, signed URL TTL)
npm run db:test-rls      # 13 cas RLS, dont 5 cas négatifs
npm run test:unit        # scoring QCM (9 cas)
npm run build            # type check + production build
```

Tous doivent passer en vert.

## 7. Monitoring (à brancher en post-déploiement)

- **Sentry** côté Next : installer `@sentry/nextjs`, ajouter le DSN dans env vars.
- **Supabase Logs** : Project → Logs → Postgres / Auth / Storage. Filtrer par erreurs RLS.
- **Quota Storage** : Project → Reports → Storage. Alerter quand > 80% du quota.
- **Alertes Vercel** : Project → Settings → Alerts (deploy failure, function errors).

## 8. Rate limiting

L'app embarque un rate limit in-memory (`lib/rate-limit.ts`) pour `/login` (5 / min) et `/reset-password` (3 / min). Sur Vercel multi-instance, c'est dégradé en "ralentisseur par lambda".

Pour un rate limit fort en prod, brancher Upstash Redis :
1. Créer une base Redis dans Upstash.
2. Remplacer `rateLimit` par `@upstash/ratelimit` + `@upstash/redis`.

## 9. Headers HTTP

`next.config.ts` applique automatiquement :
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

Pas de CSP stricte par défaut (Next + Turbopack utilisent du JS inline lors des hydratations). Si besoin : générer une nonce via middleware et l'injecter.

## 10. Checklist pré-bascule

- [ ] Migrations appliquées sur le projet Supabase prod
- [ ] Variables d'env saisies dans Vercel (Production scope)
- [ ] Cron `/api/cron/publish` répond 200 avec le bon `CRON_SECRET`
- [ ] Audit `npm run audit:security` : 0 issue
- [ ] Tests RLS `npm run db:test-rls` : 13/13
- [ ] Tests unit `npm run test:unit` : 9/9
- [ ] Domaine custom configuré + redirect URLs Supabase à jour
- [ ] Backups Supabase activés
- [ ] Premier admin créé + au moins un test de bout en bout côté élève

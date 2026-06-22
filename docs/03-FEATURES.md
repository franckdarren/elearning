# FEATURES — Fonctionnalités par rôle

## 1. Authentification (commun)
- Connexion email + mot de passe (Supabase Auth).
- Mots de passe chiffrés (géré nativement par Supabase).
- Réinitialisation de mot de passe par email.
- Redirection automatique vers le dashboard du rôle après login.
- Middleware : protège chaque groupe de routes selon le rôle. Un élève ne peut pas atteindre `/admin/*`, etc.
- Déconnexion.

## 2. Administrateur
**Tous les droits.**
- CRUD gestionnaires, enseignants, élèves (création de compte = invitation Supabase Auth + ligne `profiles`).
- CRUD classes, matières, années scolaires.
- Associer matières ↔ classes (`class_subjects`).
- Affecter enseignants à (classe + matière).
- Inscrire élèves à une classe + définir leurs matières autorisées.
- Voir toutes les statistiques globales.
- Paramètres & sécurité.

## 3. Gestionnaire
**Responsable de SON établissement** (un gestionnaire ↔ un établissement). Périmètre = tout l'établissement.
- CRUD **utilisateurs** : créer/modifier/désactiver/supprimer **enseignants et élèves** de son établissement (jamais admin ni gestionnaire ; l'établissement est imposé automatiquement).
- CRUD classes, matières.
- Gestion des affectations (enseignants, élèves).
- **Fonctionnalités pédagogiques complètes** (comme un enseignant, mais sur toutes les classes+matières de l'établissement) : chapitres, séquences, vidéos, documents, QCM.
- Consultation des **résultats** des élèves de l'établissement.
- Programmation des publications.
- Statistiques de son périmètre.

## 4. Enseignant
**Limité à ses (classe + matière) assignées.**
- CRUD chapitres.
- CRUD séquences (facultatives).
- Ajout/édition vidéos (upload ou URL).
- Ajout/édition documents (PDF, Word…).
- CRUD QCM (questions, options, bonnes réponses).
- Programmation des publications.
- Consultation des résultats des élèves de son périmètre.

## 5. Élève
**Limité à sa classe + ses matières autorisées + contenu publié.**
- Voir ses matières autorisées.
- Naviguer : Matière → Chapitre → (Séquence) → Ressources.
- Visionner les vidéos (lecteur sécurisé, signed URL).
- Consulter/télécharger documents (selon `document_access`).
- Passer les QCM (respect tentatives, dates d'ouverture/fermeture).
- Voir ses résultats + corrigé après soumission.
- Suivre sa progression (par matière + globale).

## 6. Ressources pédagogiques

### Vidéos
Champs : titre, description, miniature (opt.), fichier/URL, durée (opt.), auteur (opt.), date création (opt.), date publication (opt.), statut.
Statuts : `draft` (visible plateforme côté staff mais ni publié ni programmé), `scheduled`, `published`, `archived`.

### Documents
Types : PDF, Word, fichiers complémentaires.
Options : publication immédiate / programmée ; téléchargeable ou consultable seulement.

## 7. QCM
- Associé à classe + matière + chapitre.
- Champs : titre, description, durée, nb tentatives, date d'ouverture, date de fermeture.
- Types de questions : choix unique, choix multiple, vrai/faux.
- Correction automatique **côté serveur**, calcul du score, affichage du corrigé après soumission.
- Historique des tentatives + consultation des résultats.

## 8. Programmation des contenus
- Vidéos : date de publication + date de retrait (opt.).
- Documents : date de publication.
- QCM : date d'ouverture + date de fermeture.
- Bascule automatique via cron (voir DATABASE §7).

## 9. Suivi pédagogique
- Suivi vidéos visionnées, documents consultés, QCM réalisés.
- Progression par matière = (ressources complétées / ressources publiées de la matière).
- Progression globale = moyenne sur les matières autorisées.
- Analyse des résultats (taux de réussite par QCM, par élève).

## 10. Notifications
Déclencheurs : nouveau cours, nouveau document, nouveau QCM, rappel avant fermeture d'un QCM, publication programmée effectuée.
Canaux : interne (table `notifications` + Supabase Realtime). Email optionnel (à brancher plus tard via Supabase / Resend).

## 11. Sécurité
- Auth sécurisée + mots de passe chiffrés (Supabase).
- Rôles & permissions via RLS.
- Vidéos protégées : bucket privé + signed URLs courtes, pas de lien direct téléchargeable.
- Journalisation des connexions (optionnel, `activity_logs`).
- Sauvegardes : automatiques côté Supabase.

## 12. Hors périmètre (phase 2, mentionné par le client)
IA pédagogique, messagerie interne, dépôt de devoirs, bulletins de notes, classes virtuelles en direct. **Ne pas implémenter pour l'instant** — garder le schéma extensible.

# UI-UX — Pages, routes & parcours

## 1. Routes par rôle

### Auth
- `/login`
- `/reset-password`

### Admin (`/admin/...`)
- `/admin/dashboard` — indicateurs globaux
- `/admin/users` — liste + création (filtre par rôle)
- `/admin/classes` — CRUD classes
- `/admin/subjects` — CRUD matières
- `/admin/assignments` — affecter enseignants + inscrire élèves + matières autorisées
- `/admin/settings`

### Gestionnaire (`/manager/...`)
- `/manager/dashboard`
- `/manager/classes`
- `/manager/subjects`
- `/manager/assignments`
- `/manager/scheduling`

### Enseignant (`/teacher/...`)
- `/teacher/dashboard`
- `/teacher/content` — arborescence chapitres/séquences/ressources de ses (classe+matière)
- `/teacher/content/[chapterId]`
- `/teacher/quizzes`
- `/teacher/quizzes/[quizId]/edit`
- `/teacher/results`

### Élève (`/student/...`)
- `/student/dashboard`
- `/student/subjects` — ses matières autorisées
- `/student/subjects/[subjectId]` — chapitres
- `/student/chapter/[chapterId]` — séquences + ressources
- `/student/quiz/[quizId]` — passage du QCM
- `/student/results`

## 2. Parcours élève (clé)
```
Login → Dashboard → Matières autorisées → Matière → Chapitre
      → (Séquence) → Vidéo / Document / QCM → Résultats / Progression
```
L'élève ne voit JAMAIS une matière non autorisée ni un contenu non publié.

## 3. Dashboards (indicateurs)

**Admin** : nb élèves, enseignants, gestionnaires, classes, matières, vidéos, QCM, contenus programmés.

**Gestionnaire** : classes gérées, matières gérées, enseignants affectés, contenus publiés, contenus programmés.

**Enseignant** : classes attribuées, matières attribuées, vidéos publiées, QCM créés, nb élèves suivis, taux de réussite.

**Élève** : progression globale, progression par matière, historique cours suivis, historique QCM, résultats.

## 4. Composants partagés
- Sidebar de navigation adaptée au rôle.
- Header avec cloche de notifications (Realtime) + menu profil.
- Badge de statut de contenu (brouillon/programmé/publié/archivé).
- Lecteur vidéo sécurisé (signed URL, pas de bouton download natif pour les vidéos view-only).
- Composant d'upload (vidéos/documents) vers bucket privé.
- Constructeur de QCM (ajout questions/options, marquage bonnes réponses).
- Sélecteur de date/heure pour la programmation.

## 5. Design
- Tailwind + shadcn/ui.
- Interface claire, sobre, orientée éducation. Lisible sur mobile et desktop.
- Voir le skill `frontend-design` pour les choix typographiques/couleurs lors de l'implémentation.
- Français comme langue par défaut de l'interface.

## 6. États & feedback
- États de chargement (skeletons) sur les listes.
- États vides explicites ("Aucune matière autorisée pour le moment").
- Toasts de confirmation sur les actions (création, publication, etc.).
- Confirmation avant suppression.

import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { classes, classSubjects, subjects } from "@/lib/db/schema";

/**
 * Une paire (classe + matière) accessible. Format identique à celui attendu
 * par les composants enseignant (ScopeSelector, QuizDialog…), de sorte que le
 * périmètre d'un gestionnaire (tout son établissement) puisse y être passé
 * exactement comme la liste des affectations d'un enseignant.
 */
export type ScopePair = {
  classId: string;
  subjectId: string;
  className: string;
  subjectName: string;
};

/**
 * Toutes les paires (classe + matière) d'un établissement, dérivées de
 * `class_subjects`. C'est le périmètre de travail d'un gestionnaire pour les
 * fonctionnalités pédagogiques (contenus, QCM, résultats).
 */
export async function getEstablishmentScope(
  establishmentId: string,
): Promise<ScopePair[]> {
  return db
    .select({
      classId: classes.id,
      subjectId: subjects.id,
      className: classes.name,
      subjectName: subjects.name,
    })
    .from(classSubjects)
    .innerJoin(classes, eq(classes.id, classSubjects.classId))
    .innerJoin(subjects, eq(subjects.id, classSubjects.subjectId))
    .where(eq(classes.establishmentId, establishmentId))
    .orderBy(asc(classes.name), asc(subjects.name));
}

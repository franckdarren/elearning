import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  pgSchema,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  date,
  jsonb,
  unique,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// External schema: auth.users (managed by Supabase Auth)
// Declared so Drizzle can reference it as a FK target without owning it.
// ---------------------------------------------------------------------------
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "manager",
  "teacher",
  "student",
]);

export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "scheduled",
  "published",
  "archived",
]);

export const resourceTypeEnum = pgEnum("resource_type", ["video", "document"]);

export const documentAccessEnum = pgEnum("document_access", [
  "downloadable",
  "view_only",
]);

export const questionTypeEnum = pgEnum("question_type", [
  "single",
  "multiple",
  "true_false",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "new_course",
  "new_document",
  "new_quiz",
  "quiz_reminder",
  "scheduled_published",
]);

// ---------------------------------------------------------------------------
// establishments
// An admin creates an establishment and assigns it to a single manager
// (managerId is UNIQUE → one manager manages at most one establishment).
// ---------------------------------------------------------------------------
export const establishments = pgTable(
  "establishments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    city: text("city"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    // FK to profiles is declared at the SQL level (migration 0006) to avoid a
    // circular reference in the Drizzle schema (profiles also points here).
    managerId: uuid("manager_id"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex("establishments_manager_uq").on(t.managerId)],
);

// ---------------------------------------------------------------------------
// profiles (1-1 with auth.users)
// ---------------------------------------------------------------------------
export const profiles = pgTable("profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  role: userRoleEnum("role").notNull().default("student"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  // null for admin (global scope); set for manager/teacher/student.
  establishmentId: uuid("establishment_id").references(
    () => establishments.id,
    { onDelete: "set null" },
  ),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// academic_years
// ---------------------------------------------------------------------------
export const academicYears = pgTable(
  "academic_years",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    label: text("label").notNull(),
    startDate: date("start_date"),
    endDate: date("end_date"),
    isCurrent: boolean("is_current").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex("academic_years_only_one_current")
      .on(t.isCurrent)
      .where(sql`${t.isCurrent} = true`),
  ],
);

// ---------------------------------------------------------------------------
// classes
// ---------------------------------------------------------------------------
export const classes = pgTable(
  "classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    establishmentId: uuid("establishment_id")
      .notNull()
      .references(() => establishments.id, { onDelete: "cascade" }),
    academicYearId: uuid("academic_year_id").references(
      () => academicYears.id,
      { onDelete: "set null" },
    ),
    name: text("name").notNull(),
    level: text("level").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("classes_establishment_idx").on(t.establishmentId)],
);

// ---------------------------------------------------------------------------
// subjects
// ---------------------------------------------------------------------------
export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    establishmentId: uuid("establishment_id")
      .notNull()
      .references(() => establishments.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("subjects_establishment_idx").on(t.establishmentId)],
);

// ---------------------------------------------------------------------------
// class_subjects
// ---------------------------------------------------------------------------
export const classSubjects = pgTable(
  "class_subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
  },
  (t) => [unique("class_subjects_class_subject_uq").on(t.classId, t.subjectId)],
);

// ---------------------------------------------------------------------------
// teacher_assignments
// ---------------------------------------------------------------------------
export const teacherAssignments = pgTable(
  "teacher_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
  },
  (t) => [
    unique("teacher_assignments_uq").on(t.teacherId, t.classId, t.subjectId),
    index("teacher_assignments_teacher_idx").on(t.teacherId),
    index("teacher_assignments_class_subject_idx").on(t.classId, t.subjectId),
  ],
);

// ---------------------------------------------------------------------------
// student_enrollments
// ---------------------------------------------------------------------------
export const studentEnrollments = pgTable(
  "student_enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
  },
  (t) => [
    unique("student_enrollments_uq").on(t.studentId, t.classId),
    index("student_enrollments_student_idx").on(t.studentId),
  ],
);

// ---------------------------------------------------------------------------
// student_subject_access
// ---------------------------------------------------------------------------
export const studentSubjectAccess = pgTable(
  "student_subject_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
  },
  (t) => [
    unique("student_subject_access_uq").on(t.studentId, t.classId, t.subjectId),
    index("student_subject_access_student_idx").on(t.studentId),
  ],
);

// ---------------------------------------------------------------------------
// chapters
// ---------------------------------------------------------------------------
export const chapters = pgTable(
  "chapters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull().default(0),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("chapters_class_subject_idx").on(t.classId, t.subjectId)],
);

// ---------------------------------------------------------------------------
// sequences (optional)
// ---------------------------------------------------------------------------
export const sequences = pgTable(
  "sequences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("sequences_chapter_idx").on(t.chapterId)],
);

// ---------------------------------------------------------------------------
// resources (videos & documents)
// ---------------------------------------------------------------------------
export const resources = pgTable(
  "resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    sequenceId: uuid("sequence_id").references(() => sequences.id, {
      onDelete: "set null",
    }),
    type: resourceTypeEnum("type").notNull(),
    title: text("title").notNull(),
    description: text("description"),

    // video
    videoPath: text("video_path"),
    thumbnailPath: text("thumbnail_path"),
    durationSeconds: integer("duration_seconds"),
    author: text("author"),

    // document
    documentPath: text("document_path"),
    documentAccess: documentAccessEnum("document_access").default("view_only"),

    status: contentStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    unpublishAt: timestamp("unpublish_at", { withTimezone: true }),
    position: integer("position").notNull().default(0),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("resources_chapter_idx").on(t.chapterId),
    index("resources_status_published_at_idx").on(t.status, t.publishedAt),
    index("resources_unpublish_at_idx").on(t.unpublishAt),
  ],
);

// ---------------------------------------------------------------------------
// quizzes
// ---------------------------------------------------------------------------
export const quizzes = pgTable(
  "quizzes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    chapterId: uuid("chapter_id").references(() => chapters.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes"),
    maxAttempts: integer("max_attempts").default(1),
    opensAt: timestamp("opens_at", { withTimezone: true }),
    closesAt: timestamp("closes_at", { withTimezone: true }),
    status: contentStatusEnum("status").notNull().default("draft"),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("quizzes_class_subject_idx").on(t.classId, t.subjectId),
    index("quizzes_status_idx").on(t.status),
  ],
);

// ---------------------------------------------------------------------------
// questions
// ---------------------------------------------------------------------------
export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    type: questionTypeEnum("type").notNull(),
    text: text("text").notNull(),
    points: numeric("points").default("1"),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("questions_quiz_idx").on(t.quizId)],
);

// ---------------------------------------------------------------------------
// question_options
// ---------------------------------------------------------------------------
export const questionOptions = pgTable(
  "question_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("question_options_question_idx").on(t.questionId)],
);

// ---------------------------------------------------------------------------
// quiz_attempts
// ---------------------------------------------------------------------------
export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    score: numeric("score"),
    maxScore: numeric("max_score"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
  (t) => [
    index("quiz_attempts_quiz_idx").on(t.quizId),
    index("quiz_attempts_student_idx").on(t.studentId),
  ],
);

// ---------------------------------------------------------------------------
// quiz_answers
// ---------------------------------------------------------------------------
export const quizAnswers = pgTable(
  "quiz_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => quizAttempts.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    selectedOptionIds: uuid("selected_option_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
  },
  (t) => [index("quiz_answers_attempt_idx").on(t.attemptId)],
);

// ---------------------------------------------------------------------------
// progress
// ---------------------------------------------------------------------------
export const progress = pgTable(
  "progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    resourceId: uuid("resource_id").references(() => resources.id, {
      onDelete: "cascade",
    }),
    watched: boolean("watched").default(false),
    watchedSeconds: integer("watched_seconds").default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [unique("progress_student_resource_uq").on(t.studentId, t.resourceId)],
);

// ---------------------------------------------------------------------------
// notifications
// ---------------------------------------------------------------------------
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("notifications_user_unread_idx")
      .on(t.userId, t.createdAt)
      .where(sql`${t.isRead} = false`),
  ],
);

// ---------------------------------------------------------------------------
// activity_logs
// ---------------------------------------------------------------------------
export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("activity_logs_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------
export type Establishment = typeof establishments.$inferSelect;
export type NewEstablishment = typeof establishments.$inferInsert;

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export type AcademicYear = typeof academicYears.$inferSelect;
export type NewAcademicYear = typeof academicYears.$inferInsert;

export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;

export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;

export type ClassSubject = typeof classSubjects.$inferSelect;
export type NewClassSubject = typeof classSubjects.$inferInsert;

export type TeacherAssignment = typeof teacherAssignments.$inferSelect;
export type NewTeacherAssignment = typeof teacherAssignments.$inferInsert;

export type StudentEnrollment = typeof studentEnrollments.$inferSelect;
export type NewStudentEnrollment = typeof studentEnrollments.$inferInsert;

export type StudentSubjectAccess = typeof studentSubjectAccess.$inferSelect;
export type NewStudentSubjectAccess = typeof studentSubjectAccess.$inferInsert;

export type Chapter = typeof chapters.$inferSelect;
export type NewChapter = typeof chapters.$inferInsert;

export type Sequence = typeof sequences.$inferSelect;
export type NewSequence = typeof sequences.$inferInsert;

export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;

export type Quiz = typeof quizzes.$inferSelect;
export type NewQuiz = typeof quizzes.$inferInsert;

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;

export type QuestionOption = typeof questionOptions.$inferSelect;
export type NewQuestionOption = typeof questionOptions.$inferInsert;

export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type NewQuizAttempt = typeof quizAttempts.$inferInsert;

export type QuizAnswer = typeof quizAnswers.$inferSelect;
export type NewQuizAnswer = typeof quizAnswers.$inferInsert;

export type Progress = typeof progress.$inferSelect;
export type NewProgress = typeof progress.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;

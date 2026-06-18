import { z } from "zod";

export const teacherAssignmentSchema = z.object({
  teacherId: z.string().uuid(),
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
});

export type TeacherAssignmentInput = z.infer<typeof teacherAssignmentSchema>;

export const studentScopeSchema = z.object({
  studentId: z.string().uuid(),
  classId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined))
    .or(z.literal("__none__").transform(() => undefined)),
  subjectIds: z.array(z.string().uuid()).default([]),
});

export type StudentScopeInput = z.infer<typeof studentScopeSchema>;

import { z } from "zod";

export const classInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Nom requis").max(80),
  level: z.string().trim().min(1, "Niveau requis").max(40),
  description: z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
  academicYearId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  subjectIds: z.array(z.string().uuid()).default([]),
});

export type ClassInput = z.infer<typeof classInputSchema>;

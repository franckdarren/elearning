import { z } from "zod";

export const subjectInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Nom requis").max(120),
  description: z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
});

export type SubjectInput = z.infer<typeof subjectInputSchema>;

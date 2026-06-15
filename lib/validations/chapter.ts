import { z } from "zod";

export const chapterInputSchema = z.object({
  id: z.string().uuid().optional(),
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  title: z.string().trim().min(1, "Titre requis").max(200),
});

export type ChapterInput = z.infer<typeof chapterInputSchema>;

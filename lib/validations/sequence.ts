import { z } from "zod";

export const sequenceInputSchema = z.object({
  id: z.string().uuid().optional(),
  chapterId: z.string().uuid(),
  title: z.string().trim().min(1, "Titre requis").max(200),
});

export type SequenceInput = z.infer<typeof sequenceInputSchema>;

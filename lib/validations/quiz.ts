import { z } from "zod";
import { contentStatusSchema } from "@/lib/validations/resource";

const optionalTimestamp = z
  .string()
  .trim()
  .optional()
  .or(z.literal("").transform(() => undefined));

export const quizInputSchema = z.object({
  id: z.string().uuid().optional(),
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  chapterId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  title: z.string().trim().min(1, "Titre requis").max(200),
  description: z
    .string()
    .trim()
    .max(2000)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
  durationMinutes: z.coerce.number().int().min(0).optional(),
  maxAttempts: z.coerce.number().int().min(1).default(1),
  opensAt: optionalTimestamp,
  closesAt: optionalTimestamp,
  status: contentStatusSchema.default("draft"),
});
export type QuizInput = z.infer<typeof quizInputSchema>;

export const questionTypeSchema = z.enum(["single", "multiple", "true_false"]);

export const questionInputSchema = z.object({
  id: z.string().uuid().optional(),
  quizId: z.string().uuid(),
  type: questionTypeSchema,
  text: z.string().trim().min(1, "Énoncé requis").max(2000),
  points: z.coerce.number().min(0).default(1),
});
export type QuestionInput = z.infer<typeof questionInputSchema>;

export const optionInputSchema = z.object({
  id: z.string().uuid().optional(),
  questionId: z.string().uuid(),
  text: z.string().trim().min(1, "Texte requis").max(500),
  isCorrect: z.coerce.boolean().default(false),
});
export type OptionInput = z.infer<typeof optionInputSchema>;

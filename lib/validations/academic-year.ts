import { z } from "zod";

export const academicYearSchema = z
  .object({
    id: z.string().uuid().optional(),
    label: z
      .string()
      .trim()
      .min(1, "Libellé requis")
      .max(40, "Maximum 40 caractères"),
    startDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format AAAA-MM-JJ attendu")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    endDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format AAAA-MM-JJ attendu")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    isCurrent: z.coerce.boolean().optional(),
  })
  .refine(
    (d) => !d.startDate || !d.endDate || d.startDate <= d.endDate,
    { message: "La date de fin doit suivre la date de début", path: ["endDate"] },
  );

export type AcademicYearInput = z.infer<typeof academicYearSchema>;

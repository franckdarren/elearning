import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional();

export const establishmentInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Nom requis").max(120),
  city: optionalText(120),
  contactEmail: z
    .string()
    .trim()
    .max(160)
    .email("Email invalide")
    .or(z.literal("").transform(() => null))
    .nullable()
    .optional(),
  contactPhone: optionalText(40),
});

export type EstablishmentInput = z.infer<typeof establishmentInputSchema>;

export const assignManagerSchema = z.object({
  establishmentId: z.string().uuid(),
  // chaîne vide = retirer le gestionnaire
  managerId: z
    .string()
    .uuid()
    .nullable()
    .or(z.literal("").transform(() => null)),
});

export type AssignManagerInput = z.infer<typeof assignManagerSchema>;

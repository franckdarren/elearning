import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const requestResetSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email invalide"),
});

export type RequestResetInput = z.infer<typeof requestResetSchema>;

export const updatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Au moins 8 caractères")
      .regex(/[A-Z]/, "Au moins une majuscule")
      .regex(/[a-z]/, "Au moins une minuscule")
      .regex(/[0-9]/, "Au moins un chiffre"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

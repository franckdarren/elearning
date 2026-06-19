import { z } from "zod";

export const userRoles = ["admin", "manager", "teacher", "student"] as const;
export const userRoleSchema = z.enum(userRoles);

export const inviteUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email invalide"),
  firstName: z.string().trim().min(1, "Prénom requis"),
  lastName: z.string().trim().min(1, "Nom requis"),
  role: userRoleSchema,
  password: z
    .string()
    .min(8, "Au moins 8 caractères")
    .regex(/[A-Z]/, "Au moins une majuscule")
    .regex(/[a-z]/, "Au moins une minuscule")
    .regex(/[0-9]/, "Au moins un chiffre"),
  establishmentId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const updateUserSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().trim().min(1, "Prénom requis"),
  lastName: z.string().trim().min(1, "Nom requis"),
  role: userRoleSchema,
  isActive: z.coerce.boolean(),
  establishmentId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

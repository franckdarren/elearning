"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { requireRole, type CurrentUser } from "@/lib/auth/permissions";
import {
  inviteUserSchema,
  updateUserSchema,
} from "@/lib/validations/user";
import { logActivity } from "@/lib/activity";

export type ActionState = { error?: string; success?: string } | null;

function adminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * Vérifie qu'un gestionnaire peut agir sur un profil cible : celui-ci doit
 * appartenir à SON établissement et être un enseignant ou un élève.
 * Renvoie un ActionState d'erreur si interdit, sinon null.
 */
async function assertManagerOwnsProfile(
  actor: CurrentUser,
  targetId: string,
): Promise<ActionState> {
  if (!actor.establishmentId) return { error: "Aucun établissement attribué" };
  const [target] = await db
    .select({ role: profiles.role, establishmentId: profiles.establishmentId })
    .from(profiles)
    .where(eq(profiles.id, targetId))
    .limit(1);
  if (!target) return { error: "Utilisateur introuvable" };
  if (
    target.establishmentId !== actor.establishmentId ||
    (target.role !== "teacher" && target.role !== "student")
  ) {
    return { error: "Action non autorisée" };
  }
  return null;
}

export async function createUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole(["admin", "manager"]);

  const parsed = inviteUserSchema.safeParse({
    email: formData.get("email"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    role: formData.get("role"),
    password: formData.get("password"),
    establishmentId: formData.get("establishmentId") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  // Un gestionnaire ne crée que des enseignants/élèves de SON établissement.
  if (actor.role === "manager") {
    if (parsed.data.role !== "teacher" && parsed.data.role !== "student") {
      return { error: "Rôle non autorisé" };
    }
    if (!actor.establishmentId) {
      return { error: "Aucun établissement attribué" };
    }
  }

  // L'admin est global ; les autres rôles sont rattachés à un établissement.
  // Pour un manager, l'établissement est imposé (jamais celui du formulaire).
  const establishmentId =
    parsed.data.role === "admin"
      ? null
      : actor.role === "manager"
        ? actor.establishmentId
        : parsed.data.establishmentId ?? null;
  if (parsed.data.role !== "admin" && !establishmentId) {
    return { error: "Établissement requis pour ce rôle" };
  }

  const supabase = adminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      role: parsed.data.role,
      establishment_id: establishmentId ?? "",
    },
  });
  if (error || !data.user) {
    return { error: error?.message ?? "Création échouée" };
  }

  // Trigger inserted a default profile; sync role + names + establishment.
  await db
    .update(profiles)
    .set({
      role: parsed.data.role,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      establishmentId,
    })
    .where(eq(profiles.id, data.user.id));

  await logActivity({
    userId: actor.id,
    action: "user.create",
    metadata: { email: parsed.data.email, role: parsed.data.role },
  });
  revalidatePath("/admin/users");
  revalidatePath("/manager/users");
  return { success: "Utilisateur créé" };
}

export async function updateUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole(["admin", "manager"]);

  const parsed = updateUserSchema.safeParse({
    id: formData.get("id"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    role: formData.get("role"),
    isActive: formData.get("isActive") === "true",
    establishmentId: formData.get("establishmentId") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  // Un gestionnaire ne gère que les enseignants/élèves de SON établissement.
  if (actor.role === "manager") {
    if (parsed.data.role !== "teacher" && parsed.data.role !== "student") {
      return { error: "Rôle non autorisé" };
    }
    const guard = await assertManagerOwnsProfile(actor, parsed.data.id);
    if (guard) return guard;
  }

  // L'admin reste global ; les autres rôles doivent avoir un établissement.
  // Pour un manager, l'établissement reste celui qu'il gère.
  const establishmentId =
    parsed.data.role === "admin"
      ? null
      : actor.role === "manager"
        ? actor.establishmentId
        : parsed.data.establishmentId ?? null;
  if (parsed.data.role !== "admin" && !establishmentId) {
    return { error: "Établissement requis pour ce rôle" };
  }

  await db
    .update(profiles)
    .set({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
      establishmentId,
    })
    .where(eq(profiles.id, parsed.data.id));

  revalidatePath("/admin/users");
  revalidatePath("/manager/users");
  return { success: "Utilisateur mis à jour" };
}

export async function toggleUserActive(formData: FormData) {
  const actor = await requireRole(["admin", "manager"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  if (actor.role === "manager") {
    const guard = await assertManagerOwnsProfile(actor, id);
    if (guard) return;
  }

  const [row] = await db
    .select({ isActive: profiles.isActive })
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1);
  if (!row) return;

  await db
    .update(profiles)
    .set({ isActive: !row.isActive })
    .where(eq(profiles.id, id));

  revalidatePath("/admin/users");
  revalidatePath("/manager/users");
}

export async function deleteUser(formData: FormData): Promise<ActionState> {
  const actor = await requireRole(["admin", "manager"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Identifiant manquant" };

  // Empêche de se supprimer soi-même
  if (id === actor.id) return { error: "Vous ne pouvez pas supprimer votre propre compte" };

  if (actor.role === "manager") {
    const guard = await assertManagerOwnsProfile(actor, id);
    if (guard) return guard;
  }

  const [row] = await db
    .select({ email: profiles.email, deletedAt: profiles.deletedAt })
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1);
  if (!row) return { error: "Utilisateur introuvable" };
  if (row.deletedAt) return { error: "Utilisateur déjà supprimé" };

  await db
    .update(profiles)
    .set({ deletedAt: new Date(), isActive: false })
    .where(eq(profiles.id, id));

  await logActivity({
    userId: actor.id,
    action: "user.delete",
    metadata: { targetUserId: id, email: row.email },
  });

  revalidatePath("/admin/users");
  revalidatePath("/manager/users");
  return { success: "Utilisateur supprimé" };
}

"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { establishments, profiles } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/permissions";
import {
  establishmentInputSchema,
  assignManagerSchema,
} from "@/lib/validations/establishment";
import { logActivity } from "@/lib/activity";

export type ActionState = { error?: string; success?: string } | null;

export async function upsertEstablishment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole("admin");

  const parsed = establishmentInputSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    city: formData.get("city"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  const { id, name, city, contactEmail, contactPhone } = parsed.data;
  const values = {
    name,
    city: city ?? null,
    contactEmail: contactEmail ?? null,
    contactPhone: contactPhone ?? null,
  };

  if (id) {
    await db.update(establishments).set(values).where(eq(establishments.id, id));
  } else {
    await db.insert(establishments).values(values);
  }

  await logActivity({
    userId: admin.id,
    action: id ? "establishment.update" : "establishment.create",
    metadata: { name },
  });
  revalidatePath("/admin/establishments");
  return { success: id ? "Établissement mis à jour" : "Établissement créé" };
}

/**
 * Attribue (ou retire) un gestionnaire à un établissement.
 * Un gestionnaire ne peut gérer qu'un seul établissement : on libère d'abord
 * tout autre établissement déjà rattaché à ce gestionnaire, puis on synchronise
 * profiles.establishment_id pour cohérence avec la RLS.
 */
export async function assignManager(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole("admin");

  const parsed = assignManagerSchema.safeParse({
    establishmentId: formData.get("establishmentId"),
    managerId: formData.get("managerId") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }
  const { establishmentId, managerId } = parsed.data;

  try {
    await db.transaction(async (tx) => {
      // Récupère le gestionnaire actuel de l'établissement (à détacher).
      const [current] = await tx
        .select({ managerId: establishments.managerId })
        .from(establishments)
        .where(eq(establishments.id, establishmentId))
        .limit(1);

      if (managerId) {
        // Vérifie que la cible est bien un gestionnaire.
        const [m] = await tx
          .select({ role: profiles.role })
          .from(profiles)
          .where(eq(profiles.id, managerId))
          .limit(1);
        if (!m || m.role !== "manager") {
          throw new Error("Le profil sélectionné n'est pas un gestionnaire");
        }

        // Libère tout autre établissement déjà géré par ce gestionnaire.
        await tx
          .update(establishments)
          .set({ managerId: null })
          .where(
            and(
              eq(establishments.managerId, managerId),
              ne(establishments.id, establishmentId),
            ),
          );
      }

      // Détache l'ancien gestionnaire (s'il change).
      if (current?.managerId && current.managerId !== managerId) {
        await tx
          .update(profiles)
          .set({ establishmentId: null })
          .where(eq(profiles.id, current.managerId));
      }

      await tx
        .update(establishments)
        .set({ managerId: managerId ?? null })
        .where(eq(establishments.id, establishmentId));

      if (managerId) {
        await tx
          .update(profiles)
          .set({ establishmentId })
          .where(eq(profiles.id, managerId));
      }
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Attribution échouée",
    };
  }

  await logActivity({
    userId: admin.id,
    action: "establishment.assign_manager",
    metadata: { establishmentId, managerId },
  });
  revalidatePath("/admin/establishments");
  return { success: managerId ? "Gestionnaire attribué" : "Gestionnaire retiré" };
}

export async function toggleEstablishmentActive(formData: FormData) {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const [row] = await db
    .select({ isActive: establishments.isActive })
    .from(establishments)
    .where(eq(establishments.id, id))
    .limit(1);
  if (!row) return;

  await db
    .update(establishments)
    .set({ isActive: !row.isActive })
    .where(eq(establishments.id, id));
  revalidatePath("/admin/establishments");
}

export async function deleteEstablishment(
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Identifiant manquant" };

  await db.delete(establishments).where(eq(establishments.id, id));

  await logActivity({
    userId: admin.id,
    action: "establishment.delete",
    metadata: { establishmentId: id },
  });
  revalidatePath("/admin/establishments");
  return { success: "Établissement supprimé" };
}

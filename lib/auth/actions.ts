"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dashboardPath } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/permissions";
import {
  loginSchema,
  requestResetSchema,
  updatePasswordSchema,
} from "@/lib/validations/auth";

export type ActionState = { error?: string; success?: string } | null;

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function signIn(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { error: "Email ou mot de passe incorrect" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return { error: "Compte désactivé" };
  }

  redirect(dashboardPath(profile.role as UserRole));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = requestResetSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Email invalide" };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl()}/auth/callback?next=/auth/update-password`,
  });

  return {
    success:
      "Si un compte existe, un lien de réinitialisation vient d'être envoyé.",
  };
}

export async function updatePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Mot de passe invalide" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Session expirée. Recommencez la demande." };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { error: error.message };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  redirect(dashboardPath((profile?.role ?? "student") as UserRole));
}

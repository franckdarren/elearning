import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UserRole = "admin" | "manager" | "teacher" | "student";

export type CurrentUser = {
  id: string;
  email: string;
  role: UserRole;
  fullName: string | null;
  isActive: boolean;
};

const DASHBOARD_BY_ROLE: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  manager: "/manager/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role, full_name, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) return null;

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role as UserRole,
    fullName: profile.full_name,
    isActive: profile.is_active,
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(
  allowed: UserRole | UserRole[],
): Promise<CurrentUser> {
  const roles = Array.isArray(allowed) ? allowed : [allowed];
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect(dashboardPath(user.role));
  }
  return user;
}

export function dashboardPath(role: UserRole): string {
  return DASHBOARD_BY_ROLE[role];
}

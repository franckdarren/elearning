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
  // The middleware validates the token on every request via getUser().
  // Server components read the already-validated session from the cookie
  // to avoid a redundant round-trip to the Supabase Auth server.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role, first_name, last_name, is_active")
    .eq("id", session.user.id)
    .single();

  if (!profile || !profile.is_active) return null;

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || null;

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role as UserRole,
    fullName,
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

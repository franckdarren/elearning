import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/login", "/reset-password", "/auth"];

type RouteGroup = {
  prefix: string;
  roles: ReadonlyArray<"admin" | "manager" | "teacher" | "student">;
};

const PROTECTED_GROUPS: ReadonlyArray<RouteGroup> = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/manager", roles: ["admin", "manager"] },
  { prefix: "/teacher", roles: ["admin", "teacher"] },
  { prefix: "/student", roles: ["student"] },
];

const DASHBOARD_BY_ROLE = {
  admin: "/admin/dashboard",
  manager: "/manager/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
} as const;

export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const group = PROTECTED_GROUPS.find((g) => pathname.startsWith(g.prefix));

  if (!user) {
    if (isPublic || pathname === "/") return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (!group) return response;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const role = profile.role as keyof typeof DASHBOARD_BY_ROLE;
  if (!group.roles.includes(role)) {
    const url = request.nextUrl.clone();
    url.pathname = DASHBOARD_BY_ROLE[role];
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

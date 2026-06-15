import { requireRole } from "@/lib/auth/permissions";
import { AppHeader } from "@/components/shared/app-header";
import { TeacherSidebar } from "@/components/teacher/teacher-sidebar";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["admin", "teacher"]);
  return (
    <>
      <AppHeader
        userId={user.id}
        fullName={user.fullName}
        email={user.email}
        role={user.role}
      />
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-6 py-8">
        <aside className="w-56 shrink-0">
          <TeacherSidebar />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
}

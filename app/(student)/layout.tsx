import { requireRole } from "@/lib/auth/permissions";
import { AppHeader } from "@/components/shared/app-header";
import { StudentSidebar } from "@/components/student/student-sidebar";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("student");
  return (
    <>
      <AppHeader fullName={user.fullName} email={user.email} role={user.role} />
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-6 py-8">
        <aside className="w-56 shrink-0">
          <StudentSidebar />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
}

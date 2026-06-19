import { DashboardPageSkeleton } from "@/components/shared/page-skeleton";

export default function TeacherDashboardLoading() {
  return (
    <DashboardPageSkeleton
      kpiCount={4}
      kpiGridClass="sm:grid-cols-2 lg:grid-cols-4"
      listSections={1}
    />
  );
}

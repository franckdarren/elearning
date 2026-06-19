import { PageHeaderSkeleton, KpiCardsSkeleton } from "@/components/shared/page-skeleton";

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <KpiCardsSkeleton count={8} />
    </div>
  );
}

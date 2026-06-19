import { PageHeaderSkeleton, TableCardSkeleton } from "@/components/shared/page-skeleton";

export default function AdminSettingsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <TableCardSkeleton title withHeaderButton columns={5} rows={4} />
    </div>
  );
}

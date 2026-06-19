import { PageHeaderSkeleton, TableCardSkeleton } from "@/components/shared/page-skeleton";

export default function ManagerSchedulingLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <TableCardSkeleton title columns={7} rows={4} />
      <TableCardSkeleton title columns={5} rows={4} />
    </div>
  );
}

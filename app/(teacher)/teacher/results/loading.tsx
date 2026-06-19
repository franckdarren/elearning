import { PageHeaderSkeleton, TableCardSkeleton } from "@/components/shared/page-skeleton";

export default function TeacherResultsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <TableCardSkeleton title columns={3} rows={4} />
      <TableCardSkeleton title columns={5} rows={8} />
    </div>
  );
}

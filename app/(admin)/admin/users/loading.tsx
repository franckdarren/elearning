import { TablePageSkeleton } from "@/components/shared/page-skeleton";

export default function AdminUsersLoading() {
  return (
    <TablePageSkeleton
      withButton
      withFilterCard
      tableColumns={5}
      tableRows={8}
    />
  );
}

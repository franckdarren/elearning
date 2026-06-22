import { TablePageSkeleton } from "@/components/shared/page-skeleton";

export default function ManagerContentLoading() {
  return <TablePageSkeleton withButton tableColumns={3} tableRows={6} />;
}

import { TablePageSkeleton } from "@/components/shared/page-skeleton";

export default function AdminAssignmentsLoading() {
  return <TablePageSkeleton withButton tableColumns={5} tableRows={7} />;
}

import { TablePageSkeleton } from "@/components/shared/page-skeleton";

export default function ManagerAssignmentsLoading() {
  return <TablePageSkeleton withButton tableColumns={5} tableRows={7} />;
}

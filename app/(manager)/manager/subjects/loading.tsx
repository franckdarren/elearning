import { TablePageSkeleton } from "@/components/shared/page-skeleton";

export default function ManagerSubjectsLoading() {
  return <TablePageSkeleton withButton tableColumns={4} tableRows={6} />;
}

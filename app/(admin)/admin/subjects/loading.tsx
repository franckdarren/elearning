import { TablePageSkeleton } from "@/components/shared/page-skeleton";

export default function AdminSubjectsLoading() {
  return <TablePageSkeleton withButton tableColumns={4} tableRows={6} />;
}

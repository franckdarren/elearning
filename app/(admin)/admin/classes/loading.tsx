import { TablePageSkeleton } from "@/components/shared/page-skeleton";

export default function AdminClassesLoading() {
  return <TablePageSkeleton withButton tableColumns={5} tableRows={6} />;
}

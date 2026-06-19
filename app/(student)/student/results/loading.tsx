import { TablePageSkeleton } from "@/components/shared/page-skeleton";

export default function StudentResultsLoading() {
  return <TablePageSkeleton withButton={false} tableColumns={4} tableRows={6} />;
}

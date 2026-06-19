import { TablePageSkeleton } from "@/components/shared/page-skeleton";

export default function TeacherProgressLoading() {
  return <TablePageSkeleton withButton={false} tableColumns={4} tableRows={8} />;
}

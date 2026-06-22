import { TablePageSkeleton } from "@/components/shared/page-skeleton";

export default function ManagerUsersLoading() {
  return <TablePageSkeleton withButton tableColumns={5} tableRows={6} />;
}

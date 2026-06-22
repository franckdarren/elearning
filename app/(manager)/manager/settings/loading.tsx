import { TablePageSkeleton } from "@/components/shared/page-skeleton";

export default function ManagerSettingsLoading() {
  return <TablePageSkeleton withButton tableColumns={5} tableRows={4} />;
}

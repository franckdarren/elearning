import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  PageHeaderSkeleton,
  ListCardSkeleton,
} from "@/components/shared/page-skeleton";

export default function TeacherContentLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      {/* Sélecteur de périmètre */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-9 w-44" />
          <Skeleton className="ml-auto h-9 w-36" />
        </CardContent>
      </Card>
      <ListCardSkeleton rows={5} />
    </div>
  );
}

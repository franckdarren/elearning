import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// ─── Blocs atomiques ──────────────────────────────────────────────────────────

export function PageHeaderSkeleton({
  withButton = false,
}: {
  withButton?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      {withButton && <Skeleton className="h-9 w-32" />}
    </div>
  );
}

export function KpiCardsSkeleton({
  count = 4,
  gridClass,
}: {
  count?: number;
  gridClass?: string;
}) {
  const grid =
    gridClass ??
    (count === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4");
  return (
    <div className={`grid gap-4 ${grid}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-3 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-14" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TableCardSkeleton({
  title = false,
  withHeaderButton = false,
  columns = 4,
  rows = 6,
}: {
  title?: boolean;
  withHeaderButton?: boolean;
  columns?: number;
  rows?: number;
}) {
  return (
    <Card>
      {title && (
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <Skeleton className="h-5 w-40" />
          {withHeaderButton && <Skeleton className="h-8 w-20" />}
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="flex gap-4 border-b px-4 py-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 border-b px-4 py-3 last:border-0"
          >
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton
                key={j}
                className={`h-4 flex-1 ${j === 0 ? "max-w-[160px]" : ""}`}
              />
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ListCardSkeleton({
  title = false,
  rows = 5,
}: {
  title?: boolean;
  rows?: number;
}) {
  return (
    <Card>
      {title && (
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
      )}
      <CardContent className={title ? "" : "pt-6"}>
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-3/4 max-w-xs" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Pages composées ──────────────────────────────────────────────────────────

/** Tableau de bord : header + KPIs + section(s) liste */
export function DashboardPageSkeleton({
  kpiCount = 4,
  kpiGridClass,
  listSections = 1,
}: {
  kpiCount?: number;
  kpiGridClass?: string;
  listSections?: number;
}) {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <KpiCardsSkeleton count={kpiCount} gridClass={kpiGridClass} />
      {Array.from({ length: listSections }).map((_, i) => (
        <ListCardSkeleton key={i} title />
      ))}
    </div>
  );
}

/** Page tableau simple : header + [carte filtres] + tableau */
export function TablePageSkeleton({
  withButton = true,
  withFilterCard = false,
  tableColumns = 4,
  tableRows = 7,
}: {
  withButton?: boolean;
  withFilterCard?: boolean;
  tableColumns?: number;
  tableRows?: number;
}) {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton withButton={withButton} />
      {withFilterCard && (
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-20" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-9 w-32" />
            </div>
          </CardContent>
        </Card>
      )}
      <TableCardSkeleton columns={tableColumns} rows={tableRows} />
    </div>
  );
}

/** Grille de cartes contenu (matières élève, etc.) */
export function CardGridPageSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-1 h-3 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Liste de ressources (chapitre élève, chapitre enseignant) */
export function ResourceListPageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Card>
        <CardContent className="p-0">
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b px-4 py-4 last:border-0"
            >
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/** Lecteur quiz (questions + options) */
export function QuizPlayerPageSkeleton({
  questions = 3,
}: {
  questions?: number;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-6 w-20 shrink-0" />
      </div>
      {Array.from({ length: questions }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-12 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      ))}
      <Skeleton className="h-10 w-full sm:w-32" />
    </div>
  );
}

/** Détail résultat (score + questions corrigées) */
export function ResultDetailPageSkeleton({
  questions = 4,
}: {
  questions?: number;
}) {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-20" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-9 w-40" />
        </CardContent>
      </Card>
      {Array.from({ length: questions }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-24" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-8 w-full rounded" />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Éditeur de quiz (titre + questions éditables) */
export function QuizEditorPageSkeleton({ questions = 3 }: { questions?: number }) {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton withButton />
      <Card>
        <CardContent className="space-y-4 pt-6">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-2/3" />
        </CardContent>
      </Card>
      {Array.from({ length: questions }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Page chapitres d'une matière (liens liste) */
export function ChapterListPageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <Card>
        <CardContent className="p-0">
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-0"
            >
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

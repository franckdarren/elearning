import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Admin · Tableau de bord" };

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className="text-sm text-zinc-500">
          Vue d&apos;ensemble de la plateforme.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Utilisateurs", "—"],
          ["Classes", "—"],
          ["Matières", "—"],
          ["Contenus publiés", "—"],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-zinc-500">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{value}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Espace administrateur</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
          Les pages de gestion (utilisateurs, classes, matières, affectations)
          arrivent en Phase 3.
        </CardContent>
      </Card>
    </div>
  );
}

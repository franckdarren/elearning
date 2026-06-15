import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Gestionnaire · Tableau de bord" };

export default function ManagerDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className="text-sm text-zinc-500">Vue de votre périmètre.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Espace gestionnaire</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
          Les outils de gestion (classes, matières, affectations, programmation)
          arrivent en Phase 6.
        </CardContent>
      </Card>
    </div>
  );
}

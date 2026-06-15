import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, dashboardPath } from "@/lib/auth/permissions";
import { LoginForm } from "./login-form";

export const metadata = { title: "Connexion · La-Passerelle Du Savoir" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(dashboardPath(user.role));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connexion</CardTitle>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}

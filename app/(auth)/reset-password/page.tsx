import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetForm } from "./reset-form";

export const metadata = {
  title: "Mot de passe oublié · La-Passerelle Du Savoir",
};

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mot de passe oublié</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Renseignez votre email, nous vous enverrons un lien pour réinitialiser
          votre mot de passe.
        </p>
        <ResetForm />
      </CardContent>
    </Card>
  );
}

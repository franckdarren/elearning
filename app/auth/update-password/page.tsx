import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { UpdatePasswordForm } from "./update-form";

export const metadata = {
  title: "Nouveau mot de passe · La-Passerelle Du Savoir",
};

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/reset-password");

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Nouveau mot de passe</CardTitle>
          </CardHeader>
          <CardContent>
            <UpdatePasswordForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

"use client";

import { useActionState } from "react";
import { updatePassword, type ActionState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updatePassword,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Nouveau mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-zinc-500">
          8 caractères min., 1 majuscule, 1 minuscule, 1 chiffre.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">Confirmation</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>

      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enregistrement…" : "Mettre à jour"}
      </Button>
    </form>
  );
}

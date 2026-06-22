"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updatePassword, type ActionState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/shared/password-input";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updatePassword,
    null,
  );

  useEffect(() => {
    if (state?.redirectTo) router.replace(state.redirectTo);
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Nouveau mot de passe</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-zinc-500">
          8 caractères min., 1 majuscule, 1 minuscule, 1 chiffre.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">Confirmation</Label>
        <PasswordInput
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          required
        />
      </div>

      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={pending || !!state?.redirectTo}
      >
        {pending ? "Enregistrement…" : "Mettre à jour"}
      </Button>
    </form>
  );
}

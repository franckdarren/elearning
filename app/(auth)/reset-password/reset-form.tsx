"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type ActionState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    requestPasswordReset,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          placeholder="vous@exemple.fr"
        />
      </div>

      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          {state.success}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer le lien"}
      </Button>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/login" className="hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}

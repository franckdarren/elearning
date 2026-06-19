"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, type ActionState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    signIn,
    null,
  );

  useEffect(() => {
    if (state?.redirectTo) {
      router.replace(state.redirectTo);
    }
  }, [state, router]);

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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Mot de passe</Label>
          <Link
            href="/reset-password"
            className="text-xs text-zinc-600 hover:underline dark:text-zinc-400"
          >
            Oublié ?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
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
        {pending ? "Connexion…" : state?.redirectTo ? "Redirection…" : "Se connecter"}
      </Button>
    </form>
  );
}

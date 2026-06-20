"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { recordSignOut } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LogoutButton({ userId }: { userId?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  function handleLogout() {
    setPending(true);
    if (userId) void recordSignOut(userId);
    const supabase = createClient();
    void supabase.auth.signOut({ scope: "local" }).then(() => {
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="gap-1.5"
      disabled={pending}
      onClick={handleLogout}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">Déconnexion</span>
    </Button>
  );
}

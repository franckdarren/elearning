"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ManagerUsersFilter({ q, role }: { q: string; role: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(q);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search) {
        params.set("q", search);
      } else {
        params.delete("q");
      }
      params.delete("page");
      startTransition(() => router.replace(`?${params.toString()}`));
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function handleRoleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set("role", value);
    } else {
      params.delete("role");
    }
    params.delete("page");
    startTransition(() => router.replace(`?${params.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative flex-1 min-w-[200px] space-y-2">
        <label htmlFor="q" className="text-xs font-medium">
          Recherche
        </label>
        <div className="relative">
          <Input
            id="q"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Email, prénom ou nom…"
          />
          {isPending && (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>
      <div className="w-48 space-y-2">
        <label htmlFor="role" className="text-xs font-medium">
          Rôle
        </label>
        <Select defaultValue={role} onValueChange={handleRoleChange}>
          <SelectTrigger id="role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="teacher">Enseignant</SelectItem>
            <SelectItem value="student">Élève</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

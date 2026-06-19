"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateUser } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: "admin" | "manager" | "teacher" | "student";
    isActive: boolean;
  };
  trigger?: React.ReactNode;
};

export function EditUserDialog({ user, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await updateUser(null, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        toast.success(result?.success ?? "Utilisateur mis à jour");
        setOpen(false);
      }
    });
  }

  function handleOpenChange(value: boolean) {
    if (!pending) {
      setOpen(value);
      if (!value) setError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="ghost" size="sm">Modifier</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier {user.email}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="id" value={user.id} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                name="firstName"
                defaultValue={user.firstName}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                name="lastName"
                defaultValue={user.lastName}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Select name="role" defaultValue={user.role}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrateur</SelectItem>
                <SelectItem value="manager">Gestionnaire</SelectItem>
                <SelectItem value="teacher">Enseignant</SelectItem>
                <SelectItem value="student">Élève</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="isActive">Statut</Label>
            <Select name="isActive" defaultValue={String(user.isActive)}>
              <SelectTrigger id="isActive">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Actif</SelectItem>
                <SelectItem value="false">Désactivé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => handleOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

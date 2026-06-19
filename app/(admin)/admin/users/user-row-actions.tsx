"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import { toggleUserActive } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditUserDialog } from "./edit-user-dialog";
import { ToggleActiveButton } from "./toggle-active-button";
import { DeleteUserButton } from "./delete-user-button";

type Props = {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: "admin" | "manager" | "teacher" | "student";
    isActive: boolean;
    establishmentId: string | null;
  };
  establishments: { id: string; name: string }[];
};

export function UserRowActions({ user, establishments }: Props) {
  const [togglePending, startToggle] = useTransition();
  const fullName = `${user.firstName} ${user.lastName}`;

  function handleToggle() {
    const fd = new FormData();
    fd.set("id", user.id);
    startToggle(async () => {
      try {
        await toggleUserActive(fd);
        toast.success(user.isActive ? "Utilisateur désactivé" : "Utilisateur réactivé");
      } catch {
        toast.error("Erreur lors de la mise à jour");
      }
    });
  }

  return (
    <>
      <div className="hidden sm:flex justify-end gap-1">
        <EditUserDialog user={user} establishments={establishments} />
        <ToggleActiveButton id={user.id} isActive={user.isActive} />
        <DeleteUserButton id={user.id} name={fullName} />
      </div>

      <div className="flex sm:hidden justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <EditUserDialog
              user={user}
              establishments={establishments}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Modifier
                </DropdownMenuItem>
              }
            />
            <DropdownMenuItem onSelect={handleToggle} disabled={togglePending}>
              {user.isActive ? "Désactiver" : "Réactiver"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DeleteUserButton
              id={user.id}
              name={fullName}
              trigger={
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-red-600 focus:text-red-600"
                >
                  Supprimer
                </DropdownMenuItem>
              }
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

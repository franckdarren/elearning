import { toggleUserActive } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";

export function ToggleActiveButton({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  return (
    <form action={toggleUserActive}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="sm">
        {isActive ? "Désactiver" : "Réactiver"}
      </Button>
    </form>
  );
}

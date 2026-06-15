import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="sm">
        Se déconnecter
      </Button>
    </form>
  );
}

import { redirect } from "next/navigation";
import { getCurrentUser, dashboardPath } from "@/lib/auth/permissions";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(dashboardPath(user.role));
}

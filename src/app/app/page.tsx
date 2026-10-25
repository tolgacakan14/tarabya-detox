import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Dashboard from "@/components/Dashboard";


export default async function AppPage() {
  const user = await getSession();
  if (!user) redirect("/");
  return <Dashboard user={user} />;
}

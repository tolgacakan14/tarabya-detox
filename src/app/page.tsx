import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import ProfilePicker from "@/components/ProfilePicker";


export default async function Home() {
  const user = await getSession();
  if (user) redirect("/app");
  return <ProfilePicker />;
}

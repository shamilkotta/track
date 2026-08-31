import { redirect } from "nlite/navigation";
import { SettingsScreen } from "@/components/settings-screen";
import { getPageSession } from "@/lib/http";

export default async function SettingsPage() {
  const session = await getPageSession();
  if (!session) redirect("/sign-in");
  return (
    <SettingsScreen
      user={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? null,
        title: typeof session.user.title === "string" ? session.user.title : "",
      }}
    />
  );
}

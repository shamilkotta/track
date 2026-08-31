import { redirect } from "nlite/navigation";
import { AuthScreen } from "@/components/auth-screen";
import { getPageSession } from "@/lib/http";

export default async function SignInPage() {
  const session = await getPageSession();
  if (session) redirect("/");
  return <AuthScreen mode="sign-in" />;
}

import { redirect } from "nlite/navigation";
import JobHuntWorkspace from "@/components/job-hunt-workspace";
import { getPageSession } from "@/lib/http";

export const rendering = "force-ssr";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getPageSession();
  if (!session) redirect("/sign-in");
  return (
    <>
      <JobHuntWorkspace
        user={{
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image ?? null,
          title: typeof session.user.title === "string" ? session.user.title : "",
        }}
      />
      {children}
    </>
  );
}

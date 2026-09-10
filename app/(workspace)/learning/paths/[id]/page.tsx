import { redirect } from "nlite/navigation";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/learning/maps/${id}`);
}

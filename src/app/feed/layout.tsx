import { requireUser } from "@/lib/auth";
import { AppNav } from "@/components/AppNav";

export default async function FeedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav user={user} />
      <main className="container-page flex-1 py-10">{children}</main>
    </div>
  );
}

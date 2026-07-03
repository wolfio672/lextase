import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { AppNav } from "@/components/AppNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("ADMIN");
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav user={user} />
      <main className="container-page flex-1 py-10">
        <div className="grid gap-8 md:grid-cols-[200px_1fr]">
          <nav className="flex gap-2 md:flex-col">
            <Link href="/admin" className="btn-ghost justify-start">Tableau de bord</Link>
            <Link href="/admin/users" className="btn-ghost justify-start">Utilisateurs</Link>
            <Link href="/admin/audit" className="btn-ghost justify-start">Journal d&rsquo;audit</Link>
          </nav>
          <div>{children}</div>
        </div>
      </main>
    </div>
  );
}

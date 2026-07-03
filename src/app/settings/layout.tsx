import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { AppNav } from "@/components/AppNav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav user={user} />
      <main className="container-page flex-1 py-10">
        <div className="grid gap-8 md:grid-cols-[200px_1fr]">
          <nav className="flex gap-2 md:flex-col">
            <Link href="/settings" className="btn-ghost justify-start">Profil</Link>
            <Link href="/settings/security" className="btn-ghost justify-start">Sécurité</Link>
          </nav>
          <div>{children}</div>
        </div>
      </main>
    </div>
  );
}

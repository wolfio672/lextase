import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/feed");

  return (
    <main className="flex-1">
      <nav className="container-page flex items-center justify-between py-8">
        <span className="font-[family-name:var(--font-display)] text-2xl italic tracking-tight">
          L&rsquo;extase
        </span>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost">Se connecter</Link>
          <Link href="/register" className="btn-primary">Rejoindre</Link>
        </div>
      </nav>

      <section className="container-page relative pt-20 pb-32 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[520px] w-[900px] -translate-x-1/2 rounded-full opacity-40 blur-[110px]"
          style={{ background: "radial-gradient(circle, var(--color-wine-bright), transparent 70%)" }}
        />
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-gold)]">
          Un espace pensé pour tes créateurs
        </p>
        <h1 className="mx-auto max-w-3xl text-balance font-[family-name:var(--font-display)] text-6xl italic leading-[1.05] sm:text-7xl">
          L&rsquo;exclusivité,
          <br />
          <span style={{ color: "var(--color-gold-bright)" }}>sublimée.</span>
        </h1>
        <p className="mx-auto mt-8 max-w-xl text-lg text-[var(--color-text-muted)]">
          Rejoins une communauté où créateurs et abonnés se retrouvent dans un cadre
          élégant, privé et pensé dans les moindres détails pour la confiance.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/register" className="btn-primary text-base px-8 py-4">
            Créer mon compte
          </Link>
          <Link href="/login" className="btn-ghost text-base px-8 py-4">
            J&rsquo;ai déjà un compte
          </Link>
        </div>
      </section>

      <section className="container-page grid gap-6 pb-28 sm:grid-cols-3">
        {[
          {
            title: "Sécurité d'abord",
            body: "Mots de passe chiffrés, double authentification, verrouillage anti-brute-force et journal d'audit sur chaque action sensible.",
          },
          {
            title: "Rôles maîtrisés",
            body: "Utilisateurs, créateurs, administrateurs et fondateurs — chaque rôle a des permissions strictement définies.",
          },
          {
            title: "Pensé pour grandir",
            body: "Une base technique solide, prête à accueillir une vraie communauté sans compromis sur la fiabilité.",
          },
        ].map((f) => (
          <div key={f.title} className="glass-card p-8">
            <h3
              className="mb-3 font-[family-name:var(--font-display)] text-xl italic"
              style={{ color: "var(--color-gold)" }}
            >
              {f.title}
            </h3>
            <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">{f.body}</p>
          </div>
        ))}
      </section>

      <footer
        className="container-page border-t py-10 text-center text-xs text-[var(--color-text-muted)]"
        style={{ borderColor: "var(--color-border)" }}
      >
        © {new Date().getFullYear()} L&rsquo;extase. Tous droits réservés.
      </footer>
    </main>
  );
}

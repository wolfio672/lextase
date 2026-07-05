import type { SessionUser } from "@/lib/session";
import { logoutAction } from "@/app/actions/auth-actions";
import { hasRole } from "@/lib/auth";
import { SecretAdminLogo } from "@/components/SecretAdminLogo";
import { NavLinks } from "@/components/NavLinks";

const ROLE_LABEL: Record<SessionUser["role"], string> = {
  USER: "Membre",
  CREATOR: "Créateur",
  ADMIN: "Admin",
  FOUNDER: "Fondateur",
};

const ROLE_BADGE_CLASS: Record<SessionUser["role"], string> = {
  USER: "badge-user",
  CREATOR: "badge-creator",
  ADMIN: "badge-admin",
  FOUNDER: "badge-founder",
};

export function AppNav({ user }: { user: SessionUser }) {
  const navItems = [
    { href: "/feed", label: "Accueil" },
    { href: "/messages", label: "Messages" },
    ...(hasRole(user, "CREATOR") ? [{ href: `/creator/${user.username}`, label: "Mon profil" }] : []),
    { href: "/settings", label: "Paramètres" },
  ];

  return (
    <header className="relative border-b" style={{ borderColor: "var(--color-border)" }}>
      <div className="container-page flex items-center justify-between py-5">
        <div className="flex items-center gap-8">
          <SecretAdminLogo canAccessAdmin={hasRole(user, "ADMIN")} />
          <NavLinks items={navItems} />
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className={ROLE_BADGE_CLASS[user.role]}>{ROLE_LABEL[user.role]}</span>
          <span className="hidden text-sm text-[var(--color-text-muted)] sm:inline">@{user.username}</span>
          <form action={logoutAction}>
            <button type="submit" className="btn-ghost px-3 py-2 text-xs sm:px-4">
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

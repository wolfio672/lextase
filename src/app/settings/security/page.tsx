import { requireUser } from "@/lib/auth";
import { TwoFactorSetup } from "@/components/TwoFactorSetup";

export default async function SettingsSecurityPage() {
  const user = await requireUser();

  return (
    <div className="glass-card max-w-xl p-8">
      <h1 className="mb-2 font-[family-name:var(--font-display)] text-2xl italic">Sécurité</h1>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        Protège ton compte avec une double authentification (2FA).
      </p>
      <TwoFactorSetup enabled={user.twoFactorEnabled} />
    </div>
  );
}

"use client";

import { useActionState, useState, useTransition } from "react";
import Image from "next/image";
import {
  beginTwoFactorSetupAction,
  confirmTwoFactorSetupAction,
  disableTwoFactorAction,
  type TwoFactorActionState,
  type SimpleActionState,
} from "@/app/actions/security-actions";
import { SubmitButton } from "@/components/SubmitButton";

export function TwoFactorSetup({ enabled }: { enabled: boolean }) {
  const [setup, setSetup] = useState<{ qrCodeDataUrl: string; manualEntryKey: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmState, confirmAction] = useActionState<TwoFactorActionState, FormData>(
    confirmTwoFactorSetupAction,
    null,
  );
  const [disableState, disableAction] = useActionState<SimpleActionState, FormData>(disableTwoFactorAction, null);

  // The confirm action's success state is held here, in a component that stays
  // mounted across the whole flow — the `enabled` prop flips to true as soon as
  // the parent Server Component revalidates, which can race the local state
  // update. Checking confirmState first means the one-time recovery codes view
  // always wins over that race, instead of getting skipped.
  if (confirmState && "success" in confirmState && confirmState.success) {
    return <RecoveryCodes codes={confirmState.recoveryCodes} />;
  }

  if (enabled) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--color-success)]">La double authentification est activée sur ce compte.</p>
        <form action={disableAction} className="space-y-4">
          {disableState?.error ? <p className="form-error">{disableState.error}</p> : null}
          <div>
            <label className="field-label" htmlFor="password">Confirme ton mot de passe pour désactiver</label>
            <input id="password" name="password" type="password" required className="field-input" />
          </div>
          <SubmitButton variant="danger" pendingLabel="Désactivation…">
            Désactiver la double authentification
          </SubmitButton>
        </form>
      </div>
    );
  }

  if (!setup) {
    return (
      <button
        type="button"
        className="btn-primary"
        disabled={isPending}
        onClick={() => startTransition(async () => setSetup(await beginTwoFactorSetupAction()))}
      >
        {isPending ? "Génération…" : "Activer la double authentification"}
      </button>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-[var(--color-text-muted)]">
        Scanne ce QR code avec ton application d&rsquo;authentification (Google Authenticator, Authy…),
        puis entre le code à 6 chiffres généré.
      </p>
      <Image src={setup.qrCodeDataUrl} alt="QR code 2FA" width={200} height={200} className="rounded-xl border" style={{ borderColor: "var(--color-border)" }} unoptimized />
      <p className="text-xs text-[var(--color-text-muted)]">
        Clé manuelle : <span className="font-mono">{setup.manualEntryKey}</span>
      </p>
      <form action={confirmAction} className="space-y-4">
        {confirmState?.error ? <p className="form-error">{confirmState.error}</p> : null}
        <div>
          <label className="field-label" htmlFor="code">Code de vérification</label>
          <input id="code" name="code" required maxLength={6} className="field-input text-center tracking-[0.3em]" />
        </div>
        <SubmitButton pendingLabel="Vérification…">Confirmer</SubmitButton>
      </form>
    </div>
  );
}

function RecoveryCodes({ codes }: { codes: string[] }) {
  return (
    <div className="space-y-4">
      <p
        className="form-error"
        style={{ color: "var(--color-success)", borderColor: "rgba(127,191,158,0.4)", background: "rgba(127,191,158,0.08)" }}
      >
        Double authentification activée.
      </p>
      <div>
        <p className="field-label">Codes de récupération (à conserver précieusement, affichés une seule fois)</p>
        <div className="grid grid-cols-2 gap-2 rounded-xl border p-4 font-mono text-sm" style={{ borderColor: "var(--color-border)" }}>
          {codes.map((code) => (
            <span key={code}>{code}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

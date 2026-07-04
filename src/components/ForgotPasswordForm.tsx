"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, type ForgotPasswordState } from "@/app/actions/auth-actions";
import { SubmitButton } from "@/components/SubmitButton";
import { AuthShell } from "@/components/AuthShell";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<ForgotPasswordState, FormData>(requestPasswordResetAction, null);

  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="On t'envoie un lien pour en choisir un nouveau."
      footer={
        <Link href="/login" className="link-gold font-semibold">
          Retour à la connexion
        </Link>
      }
    >
      {state?.success ? (
        <p className="text-sm text-[var(--color-text-muted)]">
          Si un compte existe avec cette adresse, un lien de réinitialisation vient de lui être envoyé.
          Vérifie ta boîte mail (et tes spams).
        </p>
      ) : (
        <form action={formAction} className="space-y-5">
          {state?.error ? <p className="form-error">{state.error}</p> : null}
          <div>
            <label className="field-label" htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" autoComplete="email" required className="field-input" />
          </div>
          <SubmitButton className="w-full" pendingLabel="Envoi…">
            Envoyer le lien
          </SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}

"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction, type ActionState } from "@/app/actions/auth-actions";
import { SubmitButton } from "@/components/SubmitButton";
import { AuthShell } from "@/components/AuthShell";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(resetPasswordAction, null);

  return (
    <AuthShell
      title="Nouveau mot de passe"
      subtitle="Choisis un mot de passe pour ton compte."
      footer={
        <Link href="/login" className="link-gold font-semibold">
          Retour à la connexion
        </Link>
      }
    >
      <form action={formAction} className="space-y-5">
        {state?.error ? <p className="form-error">{state.error}</p> : null}
        <input type="hidden" name="token" value={token} />
        <div>
          <label className="field-label" htmlFor="password">Nouveau mot de passe</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className="field-input"
          />
        </div>
        <SubmitButton className="w-full" pendingLabel="Enregistrement…">
          Réinitialiser le mot de passe
        </SubmitButton>
      </form>
    </AuthShell>
  );
}

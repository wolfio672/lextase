"use client";

import { useActionState } from "react";
import { verify2FAAction, type ActionState } from "@/app/actions/auth-actions";
import { SubmitButton } from "@/components/SubmitButton";
import { AuthShell } from "@/components/AuthShell";

export default function Verify2FAPage() {
  const [state, formAction] = useActionState<ActionState, FormData>(verify2FAAction, null);

  return (
    <AuthShell
      title="Vérification"
      subtitle="Entre le code à 6 chiffres de ton application d'authentification, ou un code de récupération."
    >
      <form action={formAction} className="space-y-5">
        {state?.error ? <p className="form-error">{state.error}</p> : null}
        <div>
          <label className="field-label" htmlFor="code">Code</label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="text"
            autoComplete="one-time-code"
            autoFocus
            required
            maxLength={14}
            placeholder="123456"
            className="field-input text-center text-lg tracking-[0.3em]"
          />
        </div>
        <SubmitButton className="w-full" pendingLabel="Vérification…">
          Valider
        </SubmitButton>
      </form>
    </AuthShell>
  );
}

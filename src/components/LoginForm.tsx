"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type ActionState } from "@/app/actions/auth-actions";
import { SubmitButton } from "@/components/SubmitButton";
import { AuthShell } from "@/components/AuthShell";

export function LoginForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(loginAction, null);

  return (
    <AuthShell
      title="Bon retour"
      subtitle="Connecte-toi pour retrouver tes créateurs."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href="/register" className="link-gold font-semibold">
            Rejoindre L&rsquo;extase
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-5">
        {state?.error ? <p className="form-error">{state.error}</p> : null}
        <div>
          <label className="field-label" htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="field-input" />
        </div>
        <div>
          <label className="field-label" htmlFor="password">Mot de passe</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="field-input"
          />
        </div>
        <SubmitButton className="w-full" pendingLabel="Connexion…">
          Se connecter
        </SubmitButton>
      </form>
    </AuthShell>
  );
}

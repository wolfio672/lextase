"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type ActionState } from "@/app/actions/auth-actions";
import { SubmitButton } from "@/components/SubmitButton";
import { AuthShell } from "@/components/AuthShell";

export function RegisterForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(registerAction, null);

  return (
    <AuthShell
      title="Rejoindre"
      subtitle="Crée ton compte en quelques secondes."
      footer={
        <>
          Déjà inscrit ?{" "}
          <Link href="/login" className="link-gold font-semibold">
            Se connecter
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-5">
        {state?.error ? <p className="form-error">{state.error}</p> : null}
        <div>
          <label className="field-label" htmlFor="displayName">Nom d&rsquo;affichage</label>
          <input id="displayName" name="displayName" type="text" required maxLength={50} className="field-input" />
        </div>
        <div>
          <label className="field-label" htmlFor="username">Nom d&rsquo;utilisateur</label>
          <input
            id="username"
            name="username"
            type="text"
            required
            pattern="[a-z0-9_]{3,24}"
            title="3 à 24 caractères : lettres minuscules, chiffres, underscore"
            className="field-input"
            onChange={(e) => {
              const clean = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
              if (clean !== e.target.value) e.target.value = clean;
            }}
          />
        </div>
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
            autoComplete="new-password"
            required
            minLength={10}
            className="field-input"
          />
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            10 caractères minimum, avec majuscule, minuscule, chiffre et caractère spécial.
          </p>
        </div>
        <SubmitButton className="w-full" pendingLabel="Création…">
          Créer mon compte
        </SubmitButton>
      </form>
    </AuthShell>
  );
}

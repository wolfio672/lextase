"use client";

import { useActionState } from "react";
import { updateProfileAction, type SimpleActionState } from "@/app/actions/profile-actions";
import { SubmitButton } from "@/components/SubmitButton";

export function ProfileForm({ displayName, bio }: { displayName: string; bio: string }) {
  const [state, formAction] = useActionState<SimpleActionState, FormData>(updateProfileAction, null);

  return (
    <form action={formAction} className="space-y-5">
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {state?.success ? <p className="form-error" style={{ color: "var(--color-success)", borderColor: "rgba(127,191,158,0.4)", background: "rgba(127,191,158,0.08)" }}>Profil mis à jour</p> : null}
      <div>
        <label className="field-label" htmlFor="displayName">Nom d&rsquo;affichage</label>
        <input
          id="displayName"
          name="displayName"
          defaultValue={displayName}
          required
          maxLength={50}
          className="field-input"
        />
      </div>
      <div>
        <label className="field-label" htmlFor="bio">Bio</label>
        <textarea id="bio" name="bio" defaultValue={bio} maxLength={280} rows={4} className="field-input resize-none" />
      </div>
      <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
    </form>
  );
}

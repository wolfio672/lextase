"use client";

import { useActionState, useRef } from "react";
import { createPostAction, type SimpleActionState } from "@/app/actions/post-actions";
import { SubmitButton } from "@/components/SubmitButton";

export function PostComposer() {
  const [state, formAction] = useActionState<SimpleActionState, FormData>(createPostAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="glass-card space-y-4 p-6"
    >
      <p className="field-label">Nouvelle publication</p>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <textarea
        name="caption"
        maxLength={2000}
        rows={3}
        placeholder="Une légende pour ta publication…"
        className="field-input resize-none"
      />
      <input
        type="file"
        name="media"
        accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
        className="text-sm text-[var(--color-text-muted)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--color-surface-raised)] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-[var(--color-text)]"
      />
      <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <input type="checkbox" name="isPremium" className="h-4 w-4 accent-[var(--color-gold)]" />
        Réservé aux abonné·e·s
      </label>
      <SubmitButton pendingLabel="Publication…">Publier</SubmitButton>
    </form>
  );
}

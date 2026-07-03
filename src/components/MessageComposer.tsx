"use client";

import { useActionState, useRef } from "react";
import { sendMessageAction, type SimpleActionState } from "@/app/actions/message-actions";
import { SubmitButton } from "@/components/SubmitButton";

export function MessageComposer({ recipientUsername }: { recipientUsername: string }) {
  const [state, formAction] = useActionState<SimpleActionState, FormData>(sendMessageAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="space-y-2"
    >
      <input type="hidden" name="recipientUsername" value={recipientUsername} />
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <div className="flex items-end gap-2">
        <textarea
          name="content"
          required
          maxLength={2000}
          rows={2}
          placeholder="Écris un message…"
          className="field-input resize-none"
        />
        <SubmitButton pendingLabel="…">Envoyer</SubmitButton>
      </div>
    </form>
  );
}

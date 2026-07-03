"use client";

import { useActionState, useState, useTransition } from "react";
import Image from "next/image";
import { SubmitButton } from "@/components/SubmitButton";
import type { SimpleActionState } from "@/app/actions/profile-actions";

export function ImageUploadForm({
  action,
  removeAction,
  fieldName,
  currentUrl,
  shape,
  label,
}: {
  action: (state: SimpleActionState, formData: FormData) => Promise<SimpleActionState>;
  removeAction: () => Promise<SimpleActionState>;
  fieldName: string;
  currentUrl: string | null;
  shape: "avatar" | "banner";
  label: string;
}) {
  const [state, formAction] = useActionState<SimpleActionState, FormData>(action, null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [isRemoving, startRemove] = useTransition();
  const [removeError, setRemoveError] = useState<string | null>(null);

  const displayUrl = preview ?? (removed ? null : currentUrl);
  const dimensions = shape === "avatar" ? { width: 96, height: 96 } : { width: 480, height: 140 };

  return (
    <form action={formAction} className="space-y-3">
      <p className="field-label">{label}</p>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {removeError ? <p className="form-error">{removeError}</p> : null}
      <div
        className={`overflow-hidden border ${shape === "avatar" ? "h-24 w-24 rounded-full" : "h-[140px] w-full max-w-[480px] rounded-xl"}`}
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        {displayUrl ? (
          <Image
            src={displayUrl}
            alt={label}
            width={dimensions.width}
            height={dimensions.height}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="file"
          name={fieldName}
          accept="image/png,image/jpeg,image/webp,image/gif"
          required
          className="text-sm text-[var(--color-text-muted)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--color-surface-raised)] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-[var(--color-text)]"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setPreview(URL.createObjectURL(file));
              setRemoved(false);
            }
          }}
        />
        <SubmitButton variant="ghost" pendingLabel="Envoi…">
          Enregistrer
        </SubmitButton>
        {displayUrl ? (
          <button
            type="button"
            className="btn-ghost px-4 py-2 text-xs"
            style={{ color: "var(--color-danger)" }}
            disabled={isRemoving}
            onClick={() =>
              startRemove(async () => {
                setRemoveError(null);
                const result = await removeAction();
                if (result?.error) setRemoveError(result.error);
                else {
                  setRemoved(true);
                  setPreview(null);
                }
              })
            }
          >
            {isRemoving ? "…" : "Supprimer"}
          </button>
        ) : null}
      </div>
    </form>
  );
}

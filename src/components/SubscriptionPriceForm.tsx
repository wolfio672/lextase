"use client";

import { useActionState } from "react";
import { updateSubscriptionPriceAction, type SimpleActionState } from "@/app/actions/subscription-actions";
import { SubmitButton } from "@/components/SubmitButton";

export function SubscriptionPriceForm({ currentPriceCents, currency }: { currentPriceCents: number | null; currency: string }) {
  const [state, formAction] = useActionState<SimpleActionState, FormData>(updateSubscriptionPriceAction, null);

  return (
    <form action={formAction} className="space-y-3">
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="field-label" htmlFor="price">
            Prix mensuel de ton abonnement ({currency.toUpperCase()})
          </label>
          <input
            id="price"
            name="price"
            type="number"
            min="0"
            max="1000"
            step="0.5"
            defaultValue={currentPriceCents ? (currentPriceCents / 100).toFixed(2) : ""}
            placeholder="0 = gratuit"
            className="field-input"
          />
        </div>
        <SubmitButton pendingLabel="…">Enregistrer</SubmitButton>
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">
        Mets 0 pour un abonnement gratuit. Les abonné·e·s existant·e·s ne sont pas affecté·e·s rétroactivement.
      </p>
    </form>
  );
}

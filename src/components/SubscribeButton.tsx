"use client";

import { useActionState } from "react";
import {
  subscribeAction,
  unsubscribeAction,
  createCreatorSubscriptionCheckoutAction,
  createBillingPortalAction,
  type SimpleActionState,
} from "@/app/actions/subscription-actions";
import { SubmitButton } from "@/components/SubmitButton";
import { PaymentActionButton } from "@/components/PaymentActionButton";

export function SubscribeButton({
  creatorUsername,
  isSubscribed,
  isPaidSubscription,
  priceLabel,
}: {
  creatorUsername: string;
  isSubscribed: boolean;
  isPaidSubscription: boolean;
  priceLabel: string | null;
}) {
  const [state, action] = useActionState<SimpleActionState, FormData>(
    isSubscribed ? unsubscribeAction : subscribeAction,
    null,
  );

  if (isSubscribed && isPaidSubscription) {
    return (
      <PaymentActionButton action={createBillingPortalAction} variant="ghost" size="sm">
        Gérer / se désabonner
      </PaymentActionButton>
    );
  }

  if (!isSubscribed && priceLabel) {
    return (
      <PaymentActionButton action={createCreatorSubscriptionCheckoutAction.bind(null, creatorUsername)} size="sm">
        {`S'abonner — ${priceLabel}`}
      </PaymentActionButton>
    );
  }

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="creatorUsername" value={creatorUsername} />
      <SubmitButton variant={isSubscribed ? "ghost" : "primary"} pendingLabel="…">
        {isSubscribed ? "Se désabonner" : "S'abonner"}
      </SubmitButton>
      {state?.error ? <p className="text-xs" style={{ color: "var(--color-danger)" }}>{state.error}</p> : null}
    </form>
  );
}

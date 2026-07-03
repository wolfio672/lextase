"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, requireRole, hasRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/session";
import { getStripe, appUrl, PAYMENT_CURRENCY, getOrCreateStripeCustomer } from "@/lib/stripe";

export type SimpleActionState = { error?: string } | null;

/** Free-tier subscribe — refuses creators who have set a price, since those must go through Stripe Checkout. */
export async function subscribeAction(_prev: SimpleActionState, formData: FormData): Promise<SimpleActionState> {
  const user = await requireUser();
  const creatorUsername = String(formData.get("creatorUsername") ?? "").trim().toLowerCase();

  const creator = await db.user.findUnique({ where: { username: creatorUsername } });
  if (!creator) return { error: "Créateur introuvable" };
  if (creator.id === user.id) return { error: "Tu ne peux pas t'abonner à toi-même" };
  if (!hasRole(creator, "CREATOR")) return { error: "Ce compte n'est pas un créateur" };
  if (creator.subscriptionPriceCents && creator.subscriptionPriceCents > 0) {
    return { error: "Cet abonnement est payant, utilise le bouton de paiement" };
  }

  await db.subscription.upsert({
    where: { subscriberId_creatorId: { subscriberId: user.id, creatorId: creator.id } },
    update: { status: "ACTIVE", startedAt: new Date(), endsAt: null },
    create: { subscriberId: user.id, creatorId: creator.id, status: "ACTIVE" },
  });

  await writeAuditLog({
    actorId: user.id,
    targetId: creator.id,
    action: "subscription.started",
    ipAddress: await getClientIp(),
  });

  revalidatePath(`/creator/${creator.username}`);
  return null;
}

/** Free-tier unsubscribe only — Stripe-backed subscriptions must be canceled via the billing portal, or Stripe keeps billing. */
export async function unsubscribeAction(_prev: SimpleActionState, formData: FormData): Promise<SimpleActionState> {
  const user = await requireUser();
  const creatorUsername = String(formData.get("creatorUsername") ?? "").trim().toLowerCase();

  const creator = await db.user.findUnique({ where: { username: creatorUsername } });
  if (!creator) return { error: "Créateur introuvable" };

  const subscription = await db.subscription.findUnique({
    where: { subscriberId_creatorId: { subscriberId: user.id, creatorId: creator.id } },
  });
  if (subscription?.stripeSubscriptionId) {
    return { error: "Abonnement payant : gère-le depuis \"Gérer mon abonnement\" dans tes paramètres" };
  }

  await db.subscription.updateMany({
    where: { subscriberId: user.id, creatorId: creator.id, status: "ACTIVE" },
    data: { status: "CANCELED", endsAt: new Date() },
  });

  await writeAuditLog({
    actorId: user.id,
    targetId: creator.id,
    action: "subscription.canceled",
    ipAddress: await getClientIp(),
  });

  revalidatePath(`/creator/${creator.username}`);
  return null;
}

const priceSchema = z.coerce.number().min(0).max(1000);

export async function updateSubscriptionPriceAction(_prev: SimpleActionState, formData: FormData): Promise<SimpleActionState> {
  const user = await requireRole("CREATOR");
  const parsed = priceSchema.safeParse(formData.get("price"));
  if (!parsed.success) return { error: "Prix invalide (entre 0 et 1000)" };

  const cents = Math.round(parsed.data * 100);
  await db.user.update({ where: { id: user.id }, data: { subscriptionPriceCents: cents === 0 ? null : cents } });

  await writeAuditLog({
    actorId: user.id,
    targetId: user.id,
    action: "creator.price_updated",
    metadata: { cents },
    ipAddress: await getClientIp(),
  });

  revalidatePath("/settings");
  revalidatePath(`/creator/${user.username}`);
  return null;
}

/** Redirects to Stripe Checkout to pay for a creator's priced subscription (card, Apple Pay, PayPal). */
export async function createCreatorSubscriptionCheckoutAction(creatorUsername: string): Promise<SimpleActionState> {
  const user = await requireUser();
  const stripe = getStripe();
  if (!stripe) return { error: "Le paiement n'est pas encore configuré sur ce site." };

  const creator = await db.user.findUnique({ where: { username: creatorUsername.toLowerCase() } });
  if (!creator) return { error: "Créateur introuvable" };
  if (creator.id === user.id) return { error: "Tu ne peux pas t'abonner à toi-même" };
  if (!hasRole(creator, "CREATOR")) return { error: "Ce compte n'est pas un créateur" };
  if (!creator.subscriptionPriceCents || creator.subscriptionPriceCents <= 0) {
    return { error: "Cet abonnement est gratuit, utilise le bouton S'abonner" };
  }

  const customerId = await getOrCreateStripeCustomer(user.id, user.email);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    payment_method_types: ["card", "paypal"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: PAYMENT_CURRENCY,
          unit_amount: creator.subscriptionPriceCents,
          recurring: { interval: "month" },
          product_data: { name: `Abonnement à ${creator.displayName} — L'extase` },
        },
      },
    ],
    success_url: `${appUrl()}/creator/${creator.username}?subscribed=1`,
    cancel_url: `${appUrl()}/creator/${creator.username}`,
    metadata: { kind: "creator_subscription", subscriberId: user.id, creatorId: creator.id },
    subscription_data: { metadata: { kind: "creator_subscription", subscriberId: user.id, creatorId: creator.id } },
  });

  if (!session.url) return { error: "Impossible de créer la session de paiement" };
  redirect(session.url);
}

/** Stripe's hosted billing portal — lets the user change/remove their saved card, view invoices, or cancel any of their creator subscriptions. */
export async function createBillingPortalAction(): Promise<SimpleActionState> {
  const user = await requireUser();
  const stripe = getStripe();
  if (!stripe) return { error: "Le paiement n'est pas encore configuré sur ce site." };

  const fullUser = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { stripeCustomerId: true } });
  if (!fullUser.stripeCustomerId) return { error: "Aucun abonnement à gérer pour le moment" };

  const session = await stripe.billingPortal.sessions.create({
    customer: fullUser.stripeCustomerId,
    return_url: `${appUrl()}/settings`,
  });

  redirect(session.url);
}

import "server-only";
import Stripe from "stripe";
import { db } from "@/lib/db";

export const PAYMENT_CURRENCY = process.env.STRIPE_CURRENCY ?? "eur";

let client: Stripe | null | undefined;

/** Returns null (never throws) when STRIPE_SECRET_KEY isn't set, so the rest of the site keeps working without payments configured. */
export function getStripe(): Stripe | null {
  if (client !== undefined) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  client = key ? new Stripe(key) : null;
  return client;
}

export function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

/** Reuses the user's existing Stripe Customer, or creates and persists a new one. */
export async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const stripe = getStripe();
  if (!stripe) throw new Error("no-stripe");

  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { stripeCustomerId: true } });
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create({ email, metadata: { userId } });
  await db.user.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

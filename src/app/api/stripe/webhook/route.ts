import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { writeAuditLog } from "@/lib/audit";

async function setCreatorSubscriptionFromStripe(subscription: Stripe.Subscription): Promise<void> {
  const { subscriberId, creatorId } = subscription.metadata;
  if (!subscriberId || !creatorId) return;

  const active = subscription.status === "active" || subscription.status === "trialing";

  await db.subscription.upsert({
    where: { subscriberId_creatorId: { subscriberId, creatorId } },
    update: {
      status: active ? "ACTIVE" : "EXPIRED",
      stripeSubscriptionId: subscription.id,
      endsAt: active ? null : new Date(),
    },
    create: {
      subscriberId,
      creatorId,
      status: active ? "ACTIVE" : "EXPIRED",
      stripeSubscriptionId: subscription.id,
    },
  });

  await writeAuditLog({
    actorId: subscriberId,
    targetId: creatorId,
    action: active ? "subscription.started" : "subscription.canceled",
    metadata: { subscriptionId: subscription.id, status: subscription.status, paid: true },
  });
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      if (subscription.metadata.kind === "creator_subscription") {
        await setCreatorSubscriptionFromStripe(subscription);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

import "server-only";
import { db } from "@/lib/db";

/**
 * A conversation may start only where a subscription relationship exists
 * (client <-> creator) — this is the whole point of gating messaging, per
 * the product requirement. Once a thread exists it stays open even if the
 * subscription later lapses, so history isn't lost.
 */
export async function canMessage(userId: string, otherId: string): Promise<boolean> {
  if (userId === otherId) return false;

  const existingMessage = await db.message.findFirst({
    where: {
      OR: [
        { senderId: userId, recipientId: otherId },
        { senderId: otherId, recipientId: userId },
      ],
    },
    select: { id: true },
  });
  if (existingMessage) return true;

  const subscription = await db.subscription.findFirst({
    where: {
      status: "ACTIVE",
      OR: [
        { subscriberId: userId, creatorId: otherId },
        { subscriberId: otherId, creatorId: userId },
      ],
    },
    select: { id: true },
  });
  return !!subscription;
}

export type ConversationSummary = {
  otherUser: { username: string; displayName: string; avatarUrl: string | null; isVerified: boolean };
  lastMessage: { content: string; createdAt: Date; senderId: string };
  unreadCount: number;
};

/** One row per counterpart, most recent message first — reduced in JS since it's a small per-user dataset. */
export async function getConversations(userId: string): Promise<ConversationSummary[]> {
  const messages = await db.message.findMany({
    where: { OR: [{ senderId: userId }, { recipientId: userId }] },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { username: true, displayName: true, avatarUrl: true, isVerified: true } },
      recipient: { select: { username: true, displayName: true, avatarUrl: true, isVerified: true } },
    },
  });

  const byOther = new Map<string, ConversationSummary>();
  const unreadByOther = new Map<string, number>();

  for (const m of messages) {
    if (m.recipientId === userId && !m.readAt) {
      unreadByOther.set(m.senderId, (unreadByOther.get(m.senderId) ?? 0) + 1);
    }
  }

  for (const m of messages) {
    const isOutgoing = m.senderId === userId;
    const otherUser = isOutgoing ? m.recipient : m.sender;
    const otherId = isOutgoing ? m.recipientId : m.senderId;
    if (byOther.has(otherId)) continue;
    byOther.set(otherId, {
      otherUser,
      lastMessage: { content: m.content, createdAt: m.createdAt, senderId: m.senderId },
      unreadCount: unreadByOther.get(otherId) ?? 0,
    });
  }

  return [...byOther.values()];
}

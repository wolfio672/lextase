import "server-only";
import { db } from "@/lib/db";
import { hasRole } from "@/lib/auth";
import type { Role } from "@prisma/client";

export async function getActiveSubscriptions(userId: string): Promise<Set<string>> {
  const subs = await db.subscription.findMany({
    where: { subscriberId: userId, status: "ACTIVE" },
    select: { creatorId: true },
  });
  return new Set(subs.map((s) => s.creatorId));
}

export function isPostUnlocked(
  post: { authorId: string; isPremium: boolean },
  viewer: { id: string; role: Role },
  subscribedCreatorIds: Set<string>,
): boolean {
  if (!post.isPremium) return true;
  if (post.authorId === viewer.id) return true;
  if (hasRole(viewer, "ADMIN")) return true;
  return subscribedCreatorIds.has(post.authorId);
}

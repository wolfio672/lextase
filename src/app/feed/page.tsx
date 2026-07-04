import Link from "next/link";
import Image from "next/image";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveSubscriptions, isPostUnlocked } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export default async function FeedPage() {
  const user = await requireUser();
  const subscribedCreatorIds = await getActiveSubscriptions(user.id);

  const posts = await db.post.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { author: { select: { username: true, displayName: true, avatarUrl: true, isVerified: true } }, media: true },
  });

  const creators = await db.user.findMany({
    where: { role: { in: ["CREATOR", "ADMIN", "FOUNDER"] }, isBanned: false },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { username: true, displayName: true, avatarUrl: true, isVerified: true },
  });

  return (
    <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-[1fr_260px]">
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-gold)]">Bienvenue</p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl italic">Ravi de te revoir, {user.displayName}</h1>
            <p className="mx-auto mt-4 max-w-md text-sm text-[var(--color-text-muted)]">
              Aucune publication pour le moment. Abonne-toi à un·e créateur·rice pour faire vivre ton fil.
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={{ ...post, createdAt: post.createdAt.toISOString() }}
              unlocked={isPostUnlocked(post, user, subscribedCreatorIds)}
              isOwner={post.authorId === user.id}
            />
          ))
        )}
      </div>

      <aside className="space-y-3">
        <p className="field-label">Découvrir</p>
        {creators.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Aucun créateur pour le moment.</p>
        ) : (
          creators.map((c) => (
            <Link key={c.username} href={`/creator/${c.username}`} className="glass-card flex items-center gap-3 p-3">
              <div className="h-9 w-9 overflow-hidden rounded-full" style={{ background: "var(--color-surface-raised)" }}>
                {c.avatarUrl ? (
                  <Image src={c.avatarUrl} alt={c.displayName} width={36} height={36} className="h-full w-full object-cover" unoptimized />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1 truncate text-sm font-semibold">
                  {c.displayName}
                  {c.isVerified ? <VerifiedBadge size={13} /> : null}
                </p>
                <p className="truncate text-xs text-[var(--color-text-muted)]">@{c.username}</p>
              </div>
            </Link>
          ))
        )}
      </aside>
    </div>
  );
}

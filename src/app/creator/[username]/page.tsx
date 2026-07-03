import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, hasRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveSubscriptions, isPostUnlocked } from "@/lib/posts";
import { canMessage } from "@/lib/messaging";
import { AppNav } from "@/components/AppNav";
import { PostComposer } from "@/components/PostComposer";
import { PostCard } from "@/components/PostCard";
import { SubscribeButton } from "@/components/SubscribeButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { PAYMENT_CURRENCY } from "@/lib/stripe";

export default async function CreatorProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const viewer = await requireUser();

  const creator = await db.user.findUnique({ where: { username: username.toLowerCase() } });
  if (!creator || creator.isBanned) notFound();

  const isOwner = viewer.id === creator.id;
  const subscribedCreatorIds = await getActiveSubscriptions(viewer.id);
  const isSubscribed = subscribedCreatorIds.has(creator.id);

  const mySubscription = isOwner
    ? null
    : await db.subscription.findUnique({
        where: { subscriberId_creatorId: { subscriberId: viewer.id, creatorId: creator.id } },
      });
  const isPaidSubscription = !!mySubscription?.stripeSubscriptionId;
  const priceLabel = creator.subscriptionPriceCents
    ? `${(creator.subscriptionPriceCents / 100).toLocaleString("fr-FR", { style: "currency", currency: PAYMENT_CURRENCY.toUpperCase() })}/mois`
    : null;

  const [posts, followerCount, postCount] = await Promise.all([
    db.post.findMany({
      where: { authorId: creator.id, isPublished: true },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { username: true, displayName: true, avatarUrl: true, isVerified: true } }, media: true },
    }),
    db.subscription.count({ where: { creatorId: creator.id, status: "ACTIVE" } }),
    db.post.count({ where: { authorId: creator.id, isPublished: true } }),
  ]);

  const canDm = isOwner ? false : await canMessage(viewer.id, creator.id);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav user={viewer} />
      <main className="container-page flex-1 py-10">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="glass-card overflow-hidden">
            <div className="h-40 w-full" style={{ background: "var(--color-surface-raised)" }}>
              {creator.bannerUrl ? (
                <Image src={creator.bannerUrl} alt="" width={800} height={160} className="h-full w-full object-cover" unoptimized />
              ) : null}
            </div>
            <div className="flex items-end justify-between px-6">
              <div
                className="-mt-10 h-20 w-20 overflow-hidden rounded-full border-4"
                style={{ borderColor: "var(--color-surface)", background: "var(--color-surface-raised)" }}
              >
                {creator.avatarUrl ? (
                  <Image src={creator.avatarUrl} alt={creator.displayName} width={80} height={80} className="h-full w-full object-cover" unoptimized />
                ) : null}
              </div>
              <div className="flex items-center gap-2 pb-4">
                {canDm ? (
                  <Link href={`/messages/${creator.username}`} className="btn-ghost px-4 py-2 text-xs">
                    Message
                  </Link>
                ) : null}
                {!isOwner && hasRole(creator, "CREATOR") ? (
                  <SubscribeButton
                    creatorUsername={creator.username}
                    isSubscribed={isSubscribed}
                    isPaidSubscription={isPaidSubscription}
                    priceLabel={priceLabel}
                  />
                ) : null}
              </div>
            </div>
            <div className="px-6 pb-6">
              <h1 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl italic">
                {creator.displayName}
                {creator.isVerified ? <VerifiedBadge size={18} /> : null}
              </h1>
              <p className="text-sm text-[var(--color-text-muted)]">@{creator.username}</p>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <span>
                  <span className="font-semibold">{followerCount}</span>{" "}
                  <span className="text-[var(--color-text-muted)]">abonné{followerCount === 1 ? "" : "s"}</span>
                </span>
                <span>
                  <span className="font-semibold">{postCount}</span>{" "}
                  <span className="text-[var(--color-text-muted)]">publication{postCount === 1 ? "" : "s"}</span>
                </span>
                {!isOwner && priceLabel && !isSubscribed ? (
                  <span className="badge-founder">{priceLabel}</span>
                ) : null}
              </div>
              {creator.bio ? <p className="mt-3 text-sm leading-relaxed">{creator.bio}</p> : null}
            </div>
          </div>

          {isOwner && hasRole(creator, "CREATOR") ? <PostComposer /> : null}

          <div className="space-y-4">
            {posts.length === 0 ? (
              <p className="text-center text-sm text-[var(--color-text-muted)]">Aucune publication pour le moment.</p>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={{ ...post, createdAt: post.createdAt.toISOString() }}
                  unlocked={isPostUnlocked(post, viewer, subscribedCreatorIds)}
                  isOwner={isOwner}
                  showAuthor={false}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

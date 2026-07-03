"use client";

import Link from "next/link";
import Image from "next/image";
import { useActionState } from "react";
import { deletePostAction, type SimpleActionState } from "@/app/actions/post-actions";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export type PostCardData = {
  id: string;
  caption: string;
  isPremium: boolean;
  createdAt: string;
  author: { username: string; displayName: string; avatarUrl: string | null; isVerified: boolean };
  media: { id: string; url: string; type: string }[];
};

export function PostCard({
  post,
  unlocked,
  isOwner,
  showAuthor = true,
}: {
  post: PostCardData;
  unlocked: boolean;
  isOwner: boolean;
  showAuthor?: boolean;
}) {
  const [, deleteAction] = useActionState<SimpleActionState, FormData>(deletePostAction, null);

  return (
    <article className="glass-card overflow-hidden">
      {showAuthor ? (
        <div className="flex items-center justify-between p-4 pb-0">
          <Link href={`/creator/${post.author.username}`} className="flex items-center gap-3">
            <div className="h-9 w-9 overflow-hidden rounded-full" style={{ background: "var(--color-surface-raised)" }}>
              {post.author.avatarUrl ? (
                <Image src={post.author.avatarUrl} alt={post.author.displayName} width={36} height={36} className="h-full w-full object-cover" unoptimized />
              ) : null}
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                {post.author.displayName}
                {post.author.isVerified ? <VerifiedBadge size={14} /> : null}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">@{post.author.username}</p>
            </div>
          </Link>
          {isOwner ? (
            <form action={deleteAction}>
              <input type="hidden" name="postId" value={post.id} />
              <button type="submit" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)]">
                Supprimer
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {post.caption ? <p className="p-4 text-sm leading-relaxed">{post.caption}</p> : null}

      {post.media.length > 0 ? (
        unlocked ? (
          <div className="grid gap-1" style={{ gridTemplateColumns: post.media.length > 1 ? "1fr 1fr" : "1fr" }}>
            {post.media.map((m) =>
              m.type === "video" ? (
                <video key={m.id} src={m.url} controls className="max-h-[520px] w-full bg-black object-contain" />
              ) : (
                <Image key={m.id} src={m.url} alt="" width={800} height={800} className="max-h-[520px] w-full object-cover" unoptimized />
              ),
            )}
          </div>
        ) : (
          <Link
            href={`/creator/${post.author.username}`}
            className="flex h-64 flex-col items-center justify-center gap-2 border-t text-center"
            style={{ borderColor: "var(--color-border)", background: "var(--color-surface-raised)" }}
          >
            <span className="text-3xl">🔒</span>
            <span className="text-sm font-semibold" style={{ color: "var(--color-gold)" }}>
              Contenu réservé aux abonné·e·s
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">Abonne-toi à @{post.author.username} pour voir ce post</span>
          </Link>
        )
      ) : null}
    </article>
  );
}

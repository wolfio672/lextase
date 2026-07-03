import Link from "next/link";
import Image from "next/image";
import { requireUser } from "@/lib/auth";
import { getConversations } from "@/lib/messaging";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export default async function MessagesPage() {
  const user = await requireUser();
  const conversations = await getConversations(user.id);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl italic">Messages</h1>
      {conversations.length === 0 ? (
        <p className="glass-card p-8 text-center text-sm text-[var(--color-text-muted)]">
          Aucune conversation pour le moment. Abonne-toi à un·e créateur·rice pour pouvoir lui écrire.
        </p>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => (
            <Link
              key={c.otherUser.username}
              href={`/messages/${c.otherUser.username}`}
              className="glass-card flex items-center gap-3 p-4"
            >
              <div className="h-10 w-10 overflow-hidden rounded-full" style={{ background: "var(--color-surface-raised)" }}>
                {c.otherUser.avatarUrl ? (
                  <Image src={c.otherUser.avatarUrl} alt={c.otherUser.displayName} width={40} height={40} className="h-full w-full object-cover" unoptimized />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold">
                    <span className="truncate">{c.otherUser.displayName}</span>
                    {c.otherUser.isVerified ? <VerifiedBadge size={13} /> : null}
                  </p>
                  {c.unreadCount > 0 ? (
                    <span className="badge-admin">{c.unreadCount}</span>
                  ) : null}
                </div>
                <p className="truncate text-xs text-[var(--color-text-muted)]">
                  {c.lastMessage.senderId === user.id ? "Toi : " : ""}
                  {c.lastMessage.content}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

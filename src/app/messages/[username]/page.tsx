import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canMessage } from "@/lib/messaging";
import { MessageComposer } from "@/components/MessageComposer";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export default async function MessageThreadPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await requireUser();

  const other = await db.user.findUnique({ where: { username: username.toLowerCase() } });
  if (!other) notFound();

  const allowed = await canMessage(user.id, other.id);
  if (!allowed) notFound();

  const messages = await db.message.findMany({
    where: {
      OR: [
        { senderId: user.id, recipientId: other.id },
        { senderId: other.id, recipientId: user.id },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  await db.message.updateMany({
    where: { senderId: other.id, recipientId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <h1 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl italic">
        {other.displayName}
        {other.isVerified ? <VerifiedBadge size={16} /> : null}
      </h1>

      <div className="glass-card flex max-h-[60vh] flex-col gap-2 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-[var(--color-text-muted)]">Dites bonjour 👋</p>
        ) : (
          messages.map((m) => {
            const isMine = m.senderId === user.id;
            return (
              <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <p
                  className="max-w-[75%] rounded-2xl px-4 py-2 text-sm"
                  style={{
                    background: isMine ? "var(--color-wine)" : "var(--color-surface-raised)",
                    color: "var(--color-text)",
                  }}
                >
                  {m.content}
                </p>
              </div>
            );
          })
        )}
      </div>

      <MessageComposer recipientUsername={other.username} />
    </div>
  );
}

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRow } from "@/components/UserRow";
import type { Role } from "@prisma/client";

function canManageRole(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === "FOUNDER") return true;
  if (actorRole === "ADMIN") return targetRole === "USER" || targetRole === "CREATOR";
  return false;
}

function canModerate(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === "FOUNDER") return targetRole !== "FOUNDER";
  if (actorRole === "ADMIN") return targetRole === "USER" || targetRole === "CREATOR";
  return false;
}

export default async function AdminUsersPage() {
  const actor = await requireRole("ADMIN");
  const [users, creators] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        role: true,
        isBanned: true,
        bannedReason: true,
        isVerified: true,
      },
    }),
    db.user.findMany({
      where: { role: { in: ["CREATOR", "ADMIN", "FOUNDER"] } },
      orderBy: { username: "asc" },
      select: { username: true, displayName: true },
    }),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl italic">Utilisateurs</h1>
      <div className="glass-card overflow-x-auto p-6">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-xs uppercase tracking-wide text-[var(--color-text-muted)]" style={{ borderColor: "var(--color-border)" }}>
              <th className="pb-3">Compte</th>
              <th className="pb-3">Rôle</th>
              <th className="pb-3 text-right">Modération</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow
                key={u.id}
                id={u.id}
                username={u.username}
                displayName={u.displayName}
                email={u.email}
                role={u.role}
                isBanned={u.isBanned}
                bannedReason={u.bannedReason}
                isVerified={u.isVerified}
                canManageRole={canManageRole(actor.role, u.role)}
                canModerate={canModerate(actor.role, u.role)}
                isFounderActor={actor.role === "FOUNDER"}
                isSelf={u.id === actor.id}
                creators={creators}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

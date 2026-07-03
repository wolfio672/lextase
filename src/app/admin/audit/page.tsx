import { db } from "@/lib/db";

export default async function AdminAuditPage() {
  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      actor: { select: { username: true } },
      target: { select: { username: true } },
    },
  });

  return (
    <div>
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl italic">Journal d&rsquo;audit</h1>
      <div className="glass-card overflow-x-auto p-6">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-xs uppercase tracking-wide text-[var(--color-text-muted)]" style={{ borderColor: "var(--color-border)" }}>
              <th className="pb-3">Date</th>
              <th className="pb-3">Action</th>
              <th className="pb-3">Acteur</th>
              <th className="pb-3">Cible</th>
              <th className="pb-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b" style={{ borderColor: "var(--color-border)" }}>
                <td className="py-3 pr-4 text-xs text-[var(--color-text-muted)]">
                  {log.createdAt.toLocaleString("fr-FR")}
                </td>
                <td className="py-3 pr-4 font-mono text-xs">{log.action}</td>
                <td className="py-3 pr-4">{log.actor ? `@${log.actor.username}` : "—"}</td>
                <td className="py-3 pr-4">{log.target ? `@${log.target.username}` : "—"}</td>
                <td className="py-3 pr-4 text-xs text-[var(--color-text-muted)]">{log.ipAddress ?? "—"}</td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[var(--color-text-muted)]">
                  Aucune activité pour le moment.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

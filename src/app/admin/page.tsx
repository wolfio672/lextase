import { db } from "@/lib/db";

export default async function AdminDashboardPage() {
  const [totalUsers, totalCreators, totalStaff, bannedUsers] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "CREATOR" } }),
    db.user.count({ where: { role: { in: ["ADMIN", "FOUNDER"] } } }),
    db.user.count({ where: { isBanned: true } }),
  ]);

  const stats = [
    { label: "Comptes au total", value: totalUsers },
    { label: "Créateurs", value: totalCreators },
    { label: "Staff (admin/fondateur)", value: totalStaff },
    { label: "Comptes suspendus", value: bannedUsers },
  ];

  return (
    <div>
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl italic">Tableau de bord</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-6">
            <p className="text-3xl font-bold" style={{ color: "var(--color-gold)" }}>{s.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

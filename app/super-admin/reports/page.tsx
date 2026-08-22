import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";

export default async function SuperAdminReportsPage() {
  const now = new Date();
  const [schools, students, invoices] = await Promise.all([
    db.school.findMany(),
    db.student.groupBy({ by: ["schoolId"], where: { status: "ACTIVE" }, _count: true }),
    db.subscriptionInvoice.findMany({ include: { payments: true, school: true } }),
  ]);

  const statusCounts = { ACTIVE: 0, TRIAL: 0, EXPIRING: 0, OVERDUE: 0, CANCELLED: 0 } as Record<string, number>;
  for (const s of schools) statusCounts[s.status]++;

  const totalStudents = students.reduce((s, x) => s + x._count, 0);

  const monthStarts = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return { label: d.toLocaleDateString("en-IN", { month: "short" }), year: d.getFullYear(), month: d.getMonth() };
  });
  const onboardedByMonth = monthStarts.map(({ label, year, month }) => ({
    label,
    count: schools.filter((s) => s.onboardedOn.getFullYear() === year && s.onboardedOn.getMonth() === month).length,
  }));
  const maxOnboard = Math.max(1, ...onboardedByMonth.map((m) => m.count));

  const topSchools = [...schools]
    .map((s) => ({ school: s, count: students.find((x) => x.schoolId === s.id)?._count ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const totalBilled = invoices.reduce((s, i) => s + Number(i.amount), 0);
  const totalCollected = invoices.reduce((s, i) => s + i.payments.reduce((sum, p) => sum + Number(p.amount), 0), 0);
  const collectionRate = totalBilled ? Math.round((totalCollected / totalBilled) * 100) : 0;

  return (
    <div style={{ padding: "28px 36px", display: "flex", flexDirection: "column", gap: 18, height: "100dvh", boxSizing: "border-box" }}>
      <div className="disp" style={{ fontSize: 22 }}>
        Platform reports
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <Stat label="Total schools" value={schools.length} />
        <Stat label="Students platform-wide" value={totalStudents.toLocaleString("en-IN")} />
        <Stat label="Billing collection rate" value={`${collectionRate}%`} color="var(--marigold-deep)" />
        <Stat label="Billed vs collected" value={`${formatINR(totalCollected)} / ${formatINR(totalBilled)}`} color="var(--teal)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18, flex: 1, minHeight: 0 }}>
        <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Schools onboarded</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 18 }}>Last 12 months</div>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 8, borderBottom: "1px solid var(--line)", paddingBottom: 2 }}>
            {onboardedByMonth.map((m, i) => (
              <div key={i} style={{ flex: 1, height: `${Math.max(3, (m.count / maxOnboard) * 100)}%`, background: "var(--teal-tint)", borderRadius: "3px 3px 0 0", position: "relative" }}>
                <span className="mono" style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", fontSize: 10.5, color: "var(--faint)" }}>
                  {m.count > 0 ? m.count : ""}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10.5, color: "var(--faint)" }}>
            {onboardedByMonth.map((m, i) => (
              <span key={i}>{m.label}</span>
            ))}
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 24, flexWrap: "wrap" }}>
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} style={{ fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>{status[0] + status.slice(1).toLowerCase()}</span> <span className="mono" style={{ fontWeight: 700 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Largest schools by enrolment</div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {topSchools.map(({ school, count }) => (
              <div key={school.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{school.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--faint)" }}>{school.city}</div>
                </div>
                <span className="mono" style={{ fontWeight: 700 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="card" style={{ padding: "16px 18px" }}>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>{label}</div>
      <div className="mono" style={{ fontSize: 22, fontWeight: 600, color: color ?? "var(--ink)" }}>
        {value}
      </div>
    </div>
  );
}

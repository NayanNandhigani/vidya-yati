import Link from "next/link";
import { db } from "@/lib/db";
import { formatINR, formatDate } from "@/lib/format";

export default async function SuperAdminDashboard() {
  const now = new Date();
  const in30Days = new Date(now);
  in30Days.setDate(in30Days.getDate() + 30);
  const fyStart = new Date(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1, 3, 1);

  const [schools, activeCount, totalStudents, paymentsThisFY, expiringInvoices, studentCounts] = await Promise.all([
    db.school.findMany({ orderBy: { onboardedOn: "desc" }, take: 6, include: { invoices: { orderBy: { dueDate: "desc" }, take: 1 } } }),
    db.school.count({ where: { status: "ACTIVE" } }),
    db.student.count({ where: { status: "ACTIVE" } }),
    db.subscriptionPayment.findMany({ where: { paidOn: { gte: fyStart } }, select: { amount: true } }),
    db.subscriptionInvoice.findMany({ where: { dueDate: { gte: now, lte: in30Days }, status: { not: "PAID" } }, include: { school: true } }),
    db.student.groupBy({ by: ["schoolId"], where: { status: "ACTIVE" }, _count: true }),
  ]);
  const studentCountBySchool = new Map(studentCounts.map((s) => [s.schoolId, s._count]));

  const totalSchools = await db.school.count();
  const revenueThisFY = paymentsThisFY.reduce((s, p) => s + Number(p.amount), 0);

  const monthStarts = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return { label: d.toLocaleDateString("en-IN", { month: "short" }), year: d.getFullYear(), month: d.getMonth() };
  });
  const allPayments = await db.subscriptionPayment.findMany({ select: { amount: true, paidOn: true } });
  const monthlyRevenue = monthStarts.map(({ label, year, month }) => ({
    label,
    amount: allPayments.filter((p) => p.paidOn.getFullYear() === year && p.paidOn.getMonth() === month).reduce((s, p) => s + Number(p.amount), 0),
  }));
  const maxRevenue = Math.max(1, ...monthlyRevenue.map((m) => m.amount));

  const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
    ACTIVE: { bg: "var(--good-tint)", fg: "var(--good)", label: "Active" },
    TRIAL: { bg: "var(--info-tint)", fg: "var(--info)", label: "Trial" },
    EXPIRING: { bg: "var(--warn-tint)", fg: "var(--warn)", label: "Expiring soon" },
    OVERDUE: { bg: "var(--critical-tint)", fg: "var(--critical)", label: "Overdue" },
    CANCELLED: { bg: "var(--line)", fg: "var(--faint)", label: "Cancelled" },
  };

  return (
    <div style={{ padding: "28px 36px", display: "flex", flexDirection: "column", gap: 22, height: "100dvh", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="disp" style={{ fontSize: 22 }}>
            Platform overview
          </div>
          <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 2 }}>{formatDate(now)}</div>
        </div>
        <Link href="/super-admin/schools" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: "9px 16px", fontSize: 13.5, fontWeight: 600, textDecoration: "none", color: "var(--ink)" }}>
          + Onboard a school
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14 }}>
        <Stat label="Schools onboarded" value={totalSchools} />
        <Stat label="Active subscriptions" value={activeCount} color="var(--good)" />
        <Stat label="Students platform-wide" value={totalStudents.toLocaleString("en-IN")} />
        <Stat label="Revenue collected — this FY" value={formatINR(revenueThisFY)} color="var(--marigold-deep)" />
        <Stat label="Expiring in 30 days" value={expiringInvoices.length} color="var(--warn)" warnBg />
      </div>

      {expiringInvoices.length > 0 && (
        <div style={{ background: "var(--warn-tint)", border: "1px solid #EED9B4", borderRadius: 10, padding: "13px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13.5, color: "#7A5407" }}>
            <b>{expiringInvoices.length} subscriptions</b> renew within 30 days —{" "}
            {expiringInvoices
              .slice(0, 3)
              .map((i) => `${i.school.name} (${i.dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })})`)
              .join(", ")}
            {expiringInvoices.length > 3 ? ` and ${expiringInvoices.length - 3} more` : ""}.
          </div>
          <Link href="/super-admin/subscriptions" style={{ fontSize: 13, fontWeight: 700, color: "var(--warn)", whiteSpace: "nowrap", textDecoration: "none" }}>
            Review renewals →
          </Link>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.4fr", gap: 18, flex: 1, minHeight: 0 }}>
        <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Subscription revenue</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 18 }}>Last 12 months</div>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 7, borderBottom: "1px solid var(--line)", paddingBottom: 2 }}>
            {monthlyRevenue.map((m, i) => (
              <div key={i} style={{ flex: 1, height: `${Math.max(3, (m.amount / maxRevenue) * 100)}%`, background: i === monthlyRevenue.length - 1 ? "var(--marigold)" : "var(--marigold-tint)", borderRadius: "3px 3px 0 0", position: "relative" }}>
                {i === monthlyRevenue.length - 1 && (
                  <div className="mono" style={{ position: "absolute", top: -22, left: "50%", transform: "translateX(-50%)", fontSize: 11.5, fontWeight: 700, color: "var(--marigold-deep)", whiteSpace: "nowrap" }}>
                    {formatINR(m.amount)}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10.5, color: "var(--faint)" }}>
            {monthlyRevenue.map((m, i) => (
              <span key={i}>{m.label}</span>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Schools</div>
            <Link href="/super-admin/schools" style={{ fontSize: 12.5, color: "var(--marigold-deep)", fontWeight: 600, textDecoration: "none" }}>
              View all
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2.1fr 1fr 0.8fr 1.1fr 1.2fr", fontSize: 11.5, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.04em", paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
            <div>School</div>
            <div>Plan</div>
            <div>Students</div>
            <div>Status</div>
            <div>Renewal</div>
          </div>
          <div style={{ overflowY: "auto" }}>
            {schools.map((s) => {
              const style = STATUS_STYLE[s.status];
              return (
                <Link key={s.id} href={`/super-admin/schools?school=${s.id}`} style={{ display: "grid", gridTemplateColumns: "2.1fr 1fr 0.8fr 1.1fr 1.2fr", alignItems: "center", padding: "13px 0", borderBottom: "1px solid var(--line)", fontSize: 13.5, textDecoration: "none", color: "inherit" }}>
                  <div style={{ fontWeight: 600 }}>{s.name}</div>
                  <div style={{ color: "var(--muted)" }}>{s.plan === "STANDARD" ? "Standard" : "Premium"}</div>
                  <div className="mono">{studentCountBySchool.get(s.id) ?? 0}</div>
                  <div>
                    <span className="pill" style={{ background: style.bg, color: style.fg }}>
                      {style.label}
                    </span>
                  </div>
                  <div className="mono" style={{ color: "var(--muted)" }}>
                    {s.invoices[0]?.dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) ?? "—"}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color, warnBg }: { label: string; value: React.ReactNode; color?: string; warnBg?: boolean }) {
  return (
    <div className="card" style={{ padding: "16px 18px", ...(warnBg ? { borderColor: "#EED9B4", background: "var(--warn-tint)" } : {}) }}>
      <div style={{ fontSize: 12, color: warnBg ? "var(--warn)" : "var(--muted)", marginBottom: 8, fontWeight: warnBg ? 600 : 400 }}>{label}</div>
      <div className="mono" style={{ fontSize: 25, fontWeight: 600, color: color ?? "var(--ink)" }}>
        {value}
      </div>
    </div>
  );
}

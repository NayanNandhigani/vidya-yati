import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { formatINR, formatDate } from "@/lib/format";
import PlatformUsageChart from "./PlatformUsageChart";
import ExpenseBreakdownChart from "../accounts/ExpenseBreakdownChart";

type Period = "day" | "month" | "year";
const SCHOOL_ROLES: UserRole[] = ["SCHOOL_ADMIN", "STAFF", "PARENT"];

function periodRange(period: Period, now: Date): { start: Date; end: Date; label: string } {
  if (period === "day") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end, label: "today" };
  }
  if (period === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear() + 1, 0, 1);
    return { start, end, label: "this year" };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end, label: "this month" };
}

export default async function SuperAdminDashboard({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const params = await searchParams;
  const period: Period = params.period === "month" || params.period === "year" ? params.period : "day";

  const now = new Date();
  const { start, end, label: periodLabel } = periodRange(period, now);
  const in30Days = new Date(now);
  in30Days.setDate(in30Days.getDate() + 30);
  const fyStart = new Date(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1, 3, 1);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [usageSchools, usageTotalsRaw, usageActiveRaw, platformTotal, platformActive, activeCount, totalStudents, paymentsThisFY, expiringInvoices, ledgerAccounts, expenseByAccount] = await Promise.all([
    db.school.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.groupBy({ by: ["schoolId", "role"], where: { schoolId: { not: null }, role: { in: SCHOOL_ROLES } }, _count: true }),
    db.user.groupBy({
      by: ["schoolId", "role"],
      where: { schoolId: { not: null }, role: { in: SCHOOL_ROLES }, activityLogs: { some: { type: "LOGIN", occurredAt: { gte: start, lt: end } } } },
      _count: true,
    }),
    db.user.count({ where: { schoolId: { not: null }, role: { in: SCHOOL_ROLES } } }),
    db.user.count({ where: { schoolId: { not: null }, role: { in: SCHOOL_ROLES }, activityLogs: { some: { type: "LOGIN", occurredAt: { gte: start, lt: end } } } } }),
    db.school.count({ where: { status: "ACTIVE" } }),
    db.student.count({ where: { status: "ACTIVE" } }),
    db.subscriptionPayment.findMany({ where: { paidOn: { gte: fyStart } }, select: { amount: true } }),
    db.subscriptionInvoice.findMany({ where: { dueDate: { gte: now, lte: in30Days }, status: { not: "PAID" } }, include: { school: true } }),
    db.ledgerAccount.findMany({ select: { id: true, name: true } }),
    db.ledgerEntry.groupBy({ by: ["ledgerAccountId"], where: { entryType: "EXPENSE", date: { gte: monthStart, lt: monthEnd } }, _sum: { amount: true } }),
  ]);

  const accountNameMap = new Map(ledgerAccounts.map((a) => [a.id, a.name]));
  const expenseSlices = expenseByAccount
    .map((g) => ({ label: accountNameMap.get(g.ledgerAccountId) ?? "Unknown", amount: Number(g._sum.amount ?? 0) }))
    .filter((s) => s.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const CHART_COLORS = ["var(--marigold)", "var(--teal)", "var(--clay)"];
  const expensePieSlices = expenseSlices.slice(0, 3).map((s, i) => ({ ...s, color: CHART_COLORS[i] }));
  const otherExpenseAmount = expenseSlices.slice(3).reduce((s, x) => s + x.amount, 0);
  if (otherExpenseAmount > 0) expensePieSlices.push({ label: "Other", amount: otherExpenseAmount, color: "var(--muted)" });

  const usageTotalMap = new Map(usageTotalsRaw.map((r) => [`${r.schoolId}:${r.role}`, r._count]));
  const usageActiveMap = new Map(usageActiveRaw.map((r) => [`${r.schoolId}:${r.role}`, r._count]));
  const usageData = usageSchools.map((s) => ({
    schoolId: s.id,
    schoolName: s.name,
    admin: { total: usageTotalMap.get(`${s.id}:SCHOOL_ADMIN`) ?? 0, active: usageActiveMap.get(`${s.id}:SCHOOL_ADMIN`) ?? 0 },
    staff: { total: usageTotalMap.get(`${s.id}:STAFF`) ?? 0, active: usageActiveMap.get(`${s.id}:STAFF`) ?? 0 },
    parent: { total: usageTotalMap.get(`${s.id}:PARENT`) ?? 0, active: usageActiveMap.get(`${s.id}:PARENT`) ?? 0 },
  }));
  const platformActivePct = platformTotal > 0 ? Math.round((platformActive / platformTotal) * 100) : 0;

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

      <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", height: 280, flex: "none" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Platform usage</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              Accounts that have actually logged in — School Admin, Staff and Parent, per school
            </div>
          </div>
          <PeriodTabs current={period} />
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "10px 0 6px" }}>
          <span className="mono" style={{ fontSize: 22, fontWeight: 600 }}>
            {platformActive.toLocaleString("en-IN")} / {platformTotal.toLocaleString("en-IN")}
          </span>
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
            accounts active {periodLabel} ({platformActivePct}%)
          </span>
        </div>

        <PlatformUsageChart data={usageData} />
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Expense breakdown</div>
            <Link href="/super-admin/accounts" style={{ fontSize: 12.5, color: "var(--marigold-deep)", fontWeight: 600, textDecoration: "none" }}>
              Open Accounts →
            </Link>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 18 }}>This month, top categories — Vidya Yati&apos;s own spend</div>
          <ExpenseBreakdownChart slices={expensePieSlices} totalLabel="total spend" formatAmount={formatINR} />
        </div>
      </div>
    </div>
  );
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

function PeriodTabs({ current }: { current: Period }) {
  return (
    <div style={{ display: "flex", gap: 4, background: "var(--paper)", borderRadius: 8, padding: 4, flex: "none" }}>
      {PERIOD_OPTIONS.map((o) => (
        <Link
          key={o.value}
          href={`/super-admin/dashboard?period=${o.value}`}
          style={{
            padding: "5px 12px",
            borderRadius: 6,
            fontSize: 12.5,
            fontWeight: current === o.value ? 700 : 500,
            color: current === o.value ? "var(--ink)" : "var(--muted)",
            background: current === o.value ? "var(--card)" : "transparent",
            textDecoration: "none",
            boxShadow: current === o.value ? "0 1px 2px rgba(0,0,0,.06)" : "none",
          }}
        >
          {o.label}
        </Link>
      ))}
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

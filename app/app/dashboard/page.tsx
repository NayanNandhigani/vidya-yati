import { auth } from "@/auth";
import { getScopedDb } from "@/lib/tenant-db";
import { formatINR, formatDate, daysUntil } from "@/lib/format";

function StatTile({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="card" style={{ padding: "15px 17px" }}>
      <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 7 }}>{label}</div>
      <div className="mono" style={{ fontSize: 23, fontWeight: 600, color: color ?? "var(--ink)" }}>
        {value}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const role = session!.user.role;
  const name = session!.user.name ?? "there";

  return (
    <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="disp" style={{ fontSize: 21 }}>
            {greeting()}, {name.split(" ")[0]}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{formatDate(new Date())}</div>
        </div>
      </div>

      {role === "PARENT" ? <ParentDashboard /> : <AdminStaffDashboard />}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

async function AdminStaffDashboard() {
  const sdb = await getScopedDb();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalStudents, todaysAttendance, enquiriesThisWeek, upcomingExam, enquiriesThisMonth, currentYear, feePaymentsThisMonth] =
    await Promise.all([
      sdb.student.count({ where: { status: "ACTIVE" } }),
      sdb.attendance.findMany({ where: { date: today } }),
      sdb.admissionEnquiry.count({ where: { createdAt: { gte: weekAgo } } }),
      sdb.exam.findFirst({ where: { startDate: { gte: today } }, orderBy: { startDate: "asc" } }),
      sdb.admissionEnquiry.findMany({ where: { createdAt: { gte: monthStart } }, select: { stage: true } }),
      sdb.academicYear.findFirst({ where: { isCurrent: true }, include: { feeStructures: true } }),
      sdb.feePayment.aggregate({ _sum: { amount: true }, where: { paidOn: { gte: monthStart } } }),
    ]);

  const attendancePct = todaysAttendance.length
    ? Math.round((todaysAttendance.filter((a) => a.status === "PRESENT").length / todaysAttendance.length) * 100)
    : null;

  const billed = (currentYear?.feeStructures ?? []).reduce((sum, fs) => sum + Number(fs.amount), 0);
  const collected = Number(feePaymentsThisMonth._sum.amount ?? 0);
  const feePct = billed > 0 ? Math.round((collected / billed) * 100) : 0;

  const enquiryCount = enquiriesThisMonth.length;
  const applicationCount = enquiriesThisMonth.filter((e) => e.stage === "APPLICATION" || e.stage === "ADMITTED").length;
  const admittedCount = enquiriesThisMonth.filter((e) => e.stage === "ADMITTED").length;

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const transactions = await sdb.accountsTransaction.findMany({ where: { date: { gte: sixMonthsAgo } } });
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { label: d.toLocaleDateString("en-IN", { month: "short" }), year: d.getFullYear(), month: d.getMonth() };
  });
  const monthlyFlow = months.map(({ label, year, month }) => {
    const inMonth = transactions.filter((t) => t.date.getFullYear() === year && t.date.getMonth() === month);
    const income = inMonth.filter((t) => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
    const expense = inMonth.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);
    return { label, income, expense };
  });
  const maxFlow = Math.max(1, ...monthlyFlow.flatMap((m) => [m.income, m.expense]));
  const netThisMonth = monthlyFlow[monthlyFlow.length - 1].income - monthlyFlow[monthlyFlow.length - 1].expense;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 13 }}>
        <StatTile label="Total students" value={totalStudents} />
        <StatTile label="Attendance today" value={attendancePct === null ? "—" : `${attendancePct}%`} color="var(--teal)" />
        <StatTile
          label="Fees this month"
          value={
            <>
              {formatINR(collected)}
              {billed > 0 && <span style={{ fontSize: 13, color: "var(--faint)", fontWeight: 500 }}> / {formatINR(billed)}</span>}
            </>
          }
          color="var(--marigold-deep)"
        />
        <StatTile label="New enquiries this week" value={enquiriesThisWeek} />
        <StatTile
          label="Upcoming exam"
          value={
            upcomingExam ? (
              <span style={{ fontSize: 15, fontWeight: 700 }}>
                {upcomingExam.name} <span style={{ fontWeight: 500, color: "var(--muted)", fontSize: 13 }}>in {daysUntil(upcomingExam.startDate)}d</span>
              </span>
            ) : (
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--faint)" }}>None scheduled</span>
            )
          }
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "0.85fr 0.85fr 1.5fr", gap: 16, flex: 1, minHeight: 0 }}>
        <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 16 }}>Admissions this month</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, justifyContent: "center" }}>
            <FunnelBar label="Enquiries" value={enquiryCount} pct={100} />
            <FunnelBar label="Applications" value={applicationCount} pct={enquiryCount ? (applicationCount / enquiryCount) * 100 : 0} opacity={0.7} />
            <FunnelBar label="Admitted" value={admittedCount} pct={enquiryCount ? (admittedCount / enquiryCount) * 100 : 0} opacity={1} />
          </div>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8 }}>
            {enquiryCount ? Math.round((admittedCount / enquiryCount) * 100) : 0}% enquiry-to-admission rate
          </div>
        </div>

        <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 16 }}>Fee collection — current year</div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
            <div className="mono" style={{ fontSize: 32, fontWeight: 600, color: "var(--marigold-deep)" }}>
              {feePct}%
            </div>
            <div style={{ height: 12, borderRadius: 6, background: "var(--marigold-tint)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${feePct}%`, background: "var(--marigold)", borderRadius: 6 }} />
            </div>
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
              {formatINR(collected)} collected of {formatINR(billed)} billed
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>Cash flow — Accounts</div>
            <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: "var(--muted)" }}>
              <span>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--teal)", marginRight: 5 }} />
                Income
              </span>
              <span>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--clay)", marginRight: 5 }} />
                Expense
              </span>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>
            Last 6 months · net this month{" "}
            <span style={{ color: netThisMonth >= 0 ? "var(--good)" : "var(--critical)", fontWeight: 700 }}>
              {netThisMonth >= 0 ? "+" : ""}
              {formatINR(netThisMonth)}
            </span>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 22, borderBottom: "1px solid var(--line)", paddingBottom: 2 }}>
            {monthlyFlow.map((m) => (
              <div key={m.label} style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 4, height: "100%" }}>
                <div style={{ flex: 1, height: `${Math.max(2, (m.income / maxFlow) * 100)}%`, background: "var(--teal)", borderRadius: "3px 3px 0 0" }} />
                <div style={{ flex: 1, height: `${Math.max(2, (m.expense / maxFlow) * 100)}%`, background: "var(--clay)", borderRadius: "3px 3px 0 0" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", marginTop: 8, fontSize: 10.5, color: "var(--faint)" }}>
            {monthlyFlow.map((m) => (
              <span key={m.label} style={{ flex: 1, textAlign: "center" }}>
                {m.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function FunnelBar({ label, value, pct, opacity = 0.45 }: { label: string; value: number; pct: number; opacity?: number }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
        <span style={{ color: "var(--muted)" }}>{label}</span>
        <span className="mono" style={{ fontWeight: 700 }}>
          {value}
        </span>
      </div>
      <div style={{ height: 9, borderRadius: 5, background: "var(--marigold-tint)" }}>
        <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, borderRadius: 5, background: "var(--marigold)", opacity }} />
      </div>
    </div>
  );
}

async function ParentDashboard() {
  const session = await auth();
  const sdb = await getScopedDb();
  const today = new Date(new Date().setHours(0, 0, 0, 0));

  const parent = await sdb.parent.findUnique({
    where: { userId: session!.user.id },
    include: {
      studentLinks: {
        include: {
          student: {
            include: {
              class: true,
              attendance: { where: { date: today }, take: 1 },
              homeworkSubmissions: { where: { status: "PENDING" }, include: { assignment: true } },
              feePayments: true,
            },
          },
        },
      },
    },
  });

  const students = parent?.studentLinks.map((l) => l.student) ?? [];

  if (students.length === 0) {
    return (
      <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
        No students are linked to your account yet. Contact your school office if this seems wrong.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {students.map((student) => (
        <div key={student.id} className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700 }}>{student.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
              Grade {student.class.grade}
              {student.class.section} · {student.admissionNo}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 13 }}>
            <StatTile
              label="Today's attendance"
              value={
                student.attendance[0] ? (
                  <span
                    style={{
                      fontSize: 15,
                      color:
                        student.attendance[0].status === "PRESENT"
                          ? "var(--good)"
                          : student.attendance[0].status === "ABSENT"
                            ? "var(--critical)"
                            : "var(--warn)",
                    }}
                  >
                    {student.attendance[0].status.replace("_", " ")}
                  </span>
                ) : (
                  <span style={{ fontSize: 14, color: "var(--faint)" }}>Not marked yet</span>
                )
              }
            />
            <StatTile label="Pending homework" value={student.homeworkSubmissions.length} />
            <StatTile label="Fee payments made" value={student.feePayments.length} />
          </div>
        </div>
      ))}
    </div>
  );
}

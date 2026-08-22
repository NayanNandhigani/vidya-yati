import Link from "next/link";
import { getScopedDb } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";
import { formatINR } from "@/lib/format";

export default async function ReportsPage() {
  await requireModuleAccess("Reports", "VIEW");
  const sdb = await getScopedDb();

  const now = new Date();
  const eightWeeksAgo = new Date(now);
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const [attendance, currentYear, students, exams, staffAttendance, routes, enquiries] = await Promise.all([
    sdb.attendance.findMany({ where: { date: { gte: eightWeeksAgo } }, select: { date: true, status: true } }),
    sdb.academicYear.findFirst({ where: { isCurrent: true } }),
    sdb.student.count({ where: { status: "ACTIVE" } }),
    sdb.exam.findMany({ include: { examSubjects: { include: { marks: true } } }, orderBy: { startDate: "desc" }, take: 5 }),
    sdb.staffAttendance.findMany({ where: { date: { gte: eightWeeksAgo } }, select: { status: true } }),
    sdb.transportRoute.findMany({ include: { assignments: true } }),
    sdb.admissionEnquiry.findMany({ select: { stage: true, createdAt: true } }),
  ]);

  const feeStructures = currentYear ? await sdb.feeStructure.findMany({ where: { yearId: currentYear.id } }) : [];
  const feePayments = await sdb.feePayment.findMany({ select: { amount: true, paidOn: true } });
  const billed = feeStructures.reduce((s, f) => s + Number(f.amount), 0);
  const collected = feePayments.reduce((s, p) => s + Number(p.amount), 0);

  // Weekly attendance trend, last 8 weeks
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = new Date(eightWeeksAgo);
    start.setDate(start.getDate() + i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { label: `Wk ${i + 1}`, start, end };
  });
  const weeklyAttendance = weeks.map((w) => {
    const inWeek = attendance.filter((a) => a.date >= w.start && a.date < w.end);
    const present = inWeek.filter((a) => a.status === "PRESENT").length;
    return { label: w.label, pct: inWeek.length ? Math.round((present / inWeek.length) * 100) : 0 };
  });
  const maxPct = Math.max(1, ...weeklyAttendance.map((w) => w.pct));

  const overallAttendancePct = attendance.length ? Math.round((attendance.filter((a) => a.status === "PRESENT").length / attendance.length) * 100) : 0;
  const feePct = billed ? Math.round((collected / billed) * 100) : 0;

  const examAvg = exams.length
    ? Math.round(
        exams.reduce((sum, e) => {
          const marks = e.examSubjects.flatMap((es) => es.marks.map((m) => ({ v: Number(m.marksObtained), max: es.maxMarks })));
          const pct = marks.length ? (marks.reduce((s, m) => s + m.v, 0) / marks.reduce((s, m) => s + m.max, 0)) * 100 : 0;
          return sum + pct;
        }, 0) / exams.length
      )
    : 0;

  const staffPresent = staffAttendance.filter((a) => a.status === "PRESENT").length;
  const staffAttPct = staffAttendance.length ? Math.round((staffPresent / staffAttendance.length) * 100) : 0;

  const totalSeats = routes.reduce((s, r) => s + (r.capacity ?? 0), 0);
  const totalRiders = routes.reduce((s, r) => s + r.assignments.length, 0);
  const transportUtil = totalSeats ? Math.round((totalRiders / totalSeats) * 100) : 0;

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const enquiriesThisMonth = enquiries.filter((e) => e.createdAt >= monthStart).length;
  const admittedThisMonth = enquiries.filter((e) => e.createdAt >= monthStart && e.stage === "ADMITTED").length;
  const conversionPct = enquiriesThisMonth ? Math.round((admittedThisMonth / enquiriesThisMonth) * 100) : 0;

  const reportCards = [
    { key: "attendance", title: "Attendance Summary", desc: "Daily & monthly attendance by class", color: "var(--teal)", tint: "var(--teal-tint)", stat: `${overallAttendancePct}%`, href: "/app/attendance" },
    { key: "fees", title: "Fee Collection", desc: "Collections, dues & defaulter list", color: "var(--marigold-deep)", tint: "var(--marigold-tint)", stat: `${feePct}% · ${formatINR(collected)}`, href: "/app/fees" },
    { key: "academic", title: "Academic Performance", desc: "Exam results & subject-wise trends", color: "var(--info)", tint: "var(--info-tint)", stat: `${examAvg}% avg`, href: "/app/exams" },
    { key: "admissions", title: "Admissions Funnel", desc: "Enquiry-to-admission conversion", color: "var(--good)", tint: "var(--good-tint)", stat: `${conversionPct}% conversion`, href: "/app/admissions" },
    { key: "staff", title: "Staff Attendance", desc: "Teaching & non-teaching attendance log", color: "var(--warn)", tint: "var(--warn-tint)", stat: `${staffAttPct}%`, href: "/app/employees" },
    { key: "transport", title: "Transport Utilization", desc: "Route-wise ridership & seat occupancy", color: "var(--teal)", tint: "var(--teal-tint)", stat: `${transportUtil}%`, href: "/app/transport" },
  ];

  return (
    <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 16, height: "100dvh", boxSizing: "border-box" }}>
      <div className="disp" style={{ fontSize: 21 }}>
        Reports &amp; analytics
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 13 }}>
        <Stat label="Total students" value={students} />
        <Stat label="Overall attendance (8wk)" value={`${overallAttendancePct}%`} color="var(--teal)" />
        <Stat label="Fee collection" value={`${feePct}%`} color="var(--marigold-deep)" />
        <Stat label="Avg. exam score" value={`${examAvg}%`} color="var(--info)" />
      </div>

      <div style={{ display: "grid", gridTemplateRows: "0.95fr 1.25fr", gap: 16, flex: 1, minHeight: 0 }}>
        <div className="card" style={{ padding: "20px 22px", display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Attendance trend — last 8 weeks</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, marginBottom: 14 }}>Weekly average, school-wide</div>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 10, borderBottom: "1px solid var(--line)", padding: "16px 4px 2px" }}>
            {weeklyAttendance.map((w) => (
              <div key={w.label} style={{ flex: 1, height: `${Math.max(4, (w.pct / maxPct) * 100)}%`, background: "var(--teal-tint)", borderRadius: "3px 3px 0 0", position: "relative" }}>
                <span className="mono" style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", fontSize: 10.5, color: "var(--faint)" }}>
                  {w.pct}%
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10.5, color: "var(--faint)" }}>
            {weeklyAttendance.map((w) => (
              <span key={w.label}>{w.label}</span>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gridTemplateRows: "repeat(2,1fr)", gap: 14, minHeight: 0 }}>
          {reportCards.map((r) => (
            <Link key={r.key} href={r.href} className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: r.tint, flex: "none" }} />
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.title}</div>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 10 }}>{r.desc}</div>
              <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: r.color, marginTop: "auto" }}>
                {r.stat}
              </div>
              <div style={{ fontSize: 11, color: "var(--marigold-deep)", fontWeight: 600, marginTop: 6 }}>View details →</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="card" style={{ padding: "15px 17px" }}>
      <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 7 }}>{label}</div>
      <div className="mono" style={{ fontSize: 23, fontWeight: 600, color: color ?? "var(--ink)" }}>
        {value}
      </div>
    </div>
  );
}

import { auth } from "@/auth";
import { getScopedDb } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";
import AttendanceFilters from "./AttendanceFilters";
import AttendanceRoster from "./AttendanceRoster";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ classId?: string; date?: string }> }) {
  const session = await auth();
  const params = await searchParams;
  const sdb = await getScopedDb();

  if (session!.user.role === "PARENT") {
    return <ParentAttendanceView />;
  }

  const accessLevel = await requireModuleAccess("Attendance", "VIEW");
  const canEdit = accessLevel === "EDIT" || accessLevel === "FULL";

  const classes = await sdb.class.findMany({ orderBy: [{ grade: "asc" }, { section: "asc" }] });
  const classId = params.classId ?? classes[0]?.id ?? "";
  const date = params.date ?? todayISO();

  const students = classId
    ? await sdb.student.findMany({ where: { classId, status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true, admissionNo: true } })
    : [];

  const existing = classId
    ? await sdb.attendance.findMany({ where: { date: new Date(`${date}T00:00:00`), studentId: { in: students.map((s) => s.id) } } })
    : [];
  const initialMarks: Record<string, "PRESENT" | "ABSENT" | "HALF_DAY"> = {};
  for (const a of existing) initialMarks[a.studentId] = a.status;

  return (
    <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 16, height: "100dvh", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        <AttendanceFilters classes={classes} classId={classId} date={date} />
      </div>
      <AttendanceRoster classId={classId} date={date} students={students} initialMarks={initialMarks} canEdit={canEdit} />
    </div>
  );
}

async function ParentAttendanceView() {
  const session = await auth();
  const sdb = await getScopedDb();

  const parent = await sdb.parent.findUnique({
    where: { userId: session!.user.id },
    include: {
      studentLinks: {
        include: {
          student: {
            include: { class: true, attendance: { orderBy: { date: "desc" }, take: 30 } },
          },
        },
      },
    },
  });

  const students = parent?.studentLinks.map((l) => l.student) ?? [];

  return (
    <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="disp" style={{ fontSize: 21 }}>
        Attendance
      </div>
      {students.length === 0 && <div style={{ color: "var(--muted)" }}>No students linked to your account.</div>}
      {students.map((s) => {
        const present = s.attendance.filter((a) => a.status === "PRESENT").length;
        const pct = s.attendance.length ? Math.round((present / s.attendance.length) * 100) : null;
        return (
          <div key={s.id} className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 15.5, fontWeight: 700 }}>{s.name}</div>
              <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: "var(--teal)" }}>
                {pct === null ? "No data" : `${pct}% present`}
              </div>
            </div>
            {s.attendance.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 13.5 }}>No attendance recorded yet.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(10,1fr)", gap: 6 }}>
                {[...s.attendance].reverse().map((a, i) => {
                  const style =
                    a.status === "PRESENT"
                      ? { bg: "var(--good-tint)", fg: "var(--good)", mark: "P" }
                      : a.status === "ABSENT"
                        ? { bg: "var(--critical-tint)", fg: "var(--critical)", mark: "A" }
                        : { bg: "var(--warn-tint)", fg: "var(--warn)", mark: "H" };
                  return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, borderRadius: 6, padding: "7px 0", background: style.bg, color: style.fg }}>
                      <span className="mono" style={{ fontSize: 11, fontWeight: 700 }}>
                        {a.date.getDate()}
                      </span>
                      <span style={{ fontSize: 8, fontWeight: 700 }}>{style.mark}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

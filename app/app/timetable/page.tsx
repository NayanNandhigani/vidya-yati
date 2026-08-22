import { auth } from "@/auth";
import { getScopedDb } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { subjectStyleFor } from "@/lib/academic";
import TimetableFilter from "./TimetableFilter";
import TimetableGrid from "./TimetableGrid";
import type { DayOfWeek } from "@prisma/client";

function todayColumn() {
  const day = new Date().getDay(); // 0=Sun..6=Sat
  return day === 0 ? -1 : day - 1; // Mon=0..Sat=5, Sunday has no column
}

async function buildGrid(sdb: Awaited<ReturnType<typeof getScopedDb>>, classId: string) {
  const slots = await sdb.timetableSlot.findMany({ where: { classId }, include: { subject: true, staff: { include: { user: true } } } });
  const grid: Record<number, Partial<Record<DayOfWeek, { subjectId: string; subjectName: string; staffId: string; staffName: string }>>> = {};
  for (const slot of slots) {
    grid[slot.periodNo] = grid[slot.periodNo] ?? {};
    grid[slot.periodNo]![slot.dayOfWeek] = {
      subjectId: slot.subjectId,
      subjectName: slot.subject.name,
      staffId: slot.staffId,
      staffName: slot.staff.user.name,
    };
  }
  return grid;
}

export default async function TimetablePage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const session = await auth();
  const params = await searchParams;
  const sdb = await getScopedDb();

  if (session!.user.role === "PARENT") {
    return <ParentTimetableView />;
  }

  const accessLevel = await requireModuleAccess("Timetable", "VIEW");
  const canEdit = accessLevel === "EDIT" || accessLevel === "FULL";

  const [classes, subjects, staff] = await Promise.all([
    sdb.class.findMany({ orderBy: [{ grade: "asc" }, { section: "asc" }], include: { classTeacher: { include: { user: true } } } }),
    sdb.subject.findMany({ orderBy: { name: "asc" } }),
    sdb.staffProfile.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } }),
  ]);

  const classId = params.classId ?? classes[0]?.id ?? "";
  const selectedClass = classes.find((c) => c.id === classId);
  const grid = classId ? await buildGrid(sdb, classId) : {};

  return (
    <div style={{ padding: "22px 30px", display: "flex", flexDirection: "column", gap: 13, height: "100dvh", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="disp" style={{ fontSize: 21 }}>
            Timetable
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{formatDate(new Date())}</div>
        </div>
        <TimetableFilter classes={classes} classId={classId} classTeacherName={selectedClass?.classTeacher?.user.name ?? null} />
      </div>

      <div className="card" style={{ padding: "10px 18px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", fontSize: 11.5, color: "var(--muted)" }}>
        {subjects.map((s) => (
          <span key={s.id}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: subjectStyleFor(s.name).fg, marginRight: 5 }} />
            {s.name}
          </span>
        ))}
      </div>

      <div className="card" style={{ padding: 0, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "84px repeat(6,1fr)", borderBottom: "1px solid var(--line)", flex: "none" }}>
          <div style={{ padding: "9px 12px", fontSize: 10, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.05em", borderRight: "1px solid var(--line)" }}>Period</div>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
            <div
              key={d}
              style={{
                padding: "9px 0",
                textAlign: "center",
                fontSize: 12.5,
                fontWeight: 700,
                borderRight: i === 5 ? "none" : "1px solid var(--line)",
                color: i === todayColumn() ? "var(--marigold-deep)" : "var(--ink)",
              }}
            >
              {d} {i === todayColumn() && <span className="mono" style={{ fontSize: 9.5, fontWeight: 600 }}>· Today</span>}
            </div>
          ))}
        </div>
        {classId ? (
          <TimetableGrid
            classId={classId}
            grid={grid}
            subjects={subjects}
            staff={staff.map((s) => ({ id: s.id, name: s.user.name }))}
            todayCol={todayColumn()}
            canEdit={canEdit}
          />
        ) : (
          <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>No classes set up yet.</div>
        )}
      </div>
    </div>
  );
}

async function ParentTimetableView() {
  const session = await auth();
  const sdb = await getScopedDb();

  const parent = await sdb.parent.findUnique({
    where: { userId: session!.user.id },
    include: { studentLinks: { include: { student: { include: { class: true } } } } },
  });
  const student = parent?.studentLinks[0]?.student;

  if (!student) {
    return (
      <div style={{ padding: "26px 34px" }}>
        <div className="disp" style={{ fontSize: 21, marginBottom: 12 }}>
          Timetable
        </div>
        <div style={{ color: "var(--muted)" }}>No students linked to your account.</div>
      </div>
    );
  }

  const [subjects, grid] = await Promise.all([sdb.subject.findMany({ orderBy: { name: "asc" } }), buildGrid(sdb, student.classId)]);

  return (
    <div style={{ padding: "22px 30px", display: "flex", flexDirection: "column", gap: 13, height: "100dvh", boxSizing: "border-box" }}>
      <div className="disp" style={{ fontSize: 21 }}>
        Timetable · {student.name} · Class {student.class.grade}-{student.class.section}
      </div>
      <div className="card" style={{ padding: 0, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "84px repeat(6,1fr)", borderBottom: "1px solid var(--line)", flex: "none" }}>
          <div style={{ padding: "9px 12px", fontSize: 10, color: "var(--faint)", textTransform: "uppercase" }}>Period</div>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} style={{ padding: "9px 0", textAlign: "center", fontSize: 12.5, fontWeight: 700 }}>
              {d}
            </div>
          ))}
        </div>
        <TimetableGrid classId={student.classId} grid={grid} subjects={subjects} staff={[]} todayCol={todayColumn()} canEdit={false} />
      </div>
    </div>
  );
}

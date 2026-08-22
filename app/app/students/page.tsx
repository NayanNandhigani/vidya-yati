import Link from "next/link";
import { getScopedDb } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";
import { initials } from "@/lib/format";
import { avatarColorFor, feeStatusFor, FEE_STATUS_STYLE, gradeFor } from "@/lib/academic";
import StudentDetailTabs from "./StudentDetailTabs";
import type { StudentStatus } from "@prisma/client";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string; q?: string; classId?: string; status?: string }>;
}) {
  await requireModuleAccess("Students", "VIEW");
  const params = await searchParams;
  const sdb = await getScopedDb();

  const [classes, currentYear] = await Promise.all([
    sdb.class.findMany({ orderBy: [{ grade: "asc" }, { section: "asc" }] }),
    sdb.academicYear.findFirst({ where: { isCurrent: true } }),
  ]);

  const students = await sdb.student.findMany({
    where: {
      ...(params.q
        ? { OR: [{ name: { contains: params.q, mode: "insensitive" } }, { admissionNo: { contains: params.q, mode: "insensitive" } }] }
        : {}),
      ...(params.classId ? { classId: params.classId } : {}),
      ...(params.status ? { status: params.status as StudentStatus } : {}),
    },
    include: {
      class: true,
      parentLinks: { include: { parent: true }, take: 1 },
      feePayments: true,
    },
    orderBy: { name: "asc" },
  });

  const feeStructures = currentYear ? await sdb.feeStructure.findMany({ where: { yearId: currentYear.id } }) : [];
  const feeStructuresByClass = new Map<string, typeof feeStructures>();
  for (const fs of feeStructures) {
    feeStructuresByClass.set(fs.classId, [...(feeStructuresByClass.get(fs.classId) ?? []), fs]);
  }

  function feeStatusForStudent(classId: string, payments: { amount: unknown }[]) {
    const structures = feeStructuresByClass.get(classId) ?? [];
    const totalDue = structures.reduce((s, f) => s + Number(f.amount), 0);
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
    const hasOverdue = structures.some((f) => f.dueDate < new Date()) && totalPaid < totalDue;
    return feeStatusFor(totalDue, totalPaid, hasOverdue);
  }

  const selectedId = params.student ?? students[0]?.id;
  const selected = selectedId
    ? await sdb.student.findUnique({
        where: { id: selectedId },
        include: {
          class: true,
          parentLinks: { include: { parent: true } },
          transportAssignment: { include: { route: true, stop: true } },
          attendance: { orderBy: { date: "desc" }, take: 15 },
          feePayments: { include: { feeStructure: true }, orderBy: { paidOn: "desc" } },
          marks: {
            include: { examSubject: { include: { exam: true, subject: true } } },
            orderBy: { examSubject: { exam: { startDate: "desc" } } },
          },
        },
      })
    : null;

  const selectedFeeStructures = selected ? (feeStructuresByClass.get(selected.classId) ?? []) : [];

  // Attendance stat totals (all recorded days, not just the last 15 shown)
  const allAttendance = selected
    ? await sdb.attendance.groupBy({ by: ["status"], where: { studentId: selected.id }, _count: true })
    : [];
  const attendanceTotals = { PRESENT: 0, ABSENT: 0, HALF_DAY: 0 };
  for (const row of allAttendance) attendanceTotals[row.status] = row._count;
  const attendanceTotal = attendanceTotals.PRESENT + attendanceTotals.ABSENT + attendanceTotals.HALF_DAY;
  const attendancePct = attendanceTotal ? Math.round((attendanceTotals.PRESENT / attendanceTotal) * 100) : null;

  // Exam marks grouped by exam
  const examGroups = new Map<string, { examName: string; date: Date; obtained: number; max: number }>();
  if (selected) {
    for (const mark of selected.marks) {
      const exam = mark.examSubject.exam;
      const key = exam.id;
      const entry = examGroups.get(key) ?? { examName: exam.name, date: exam.startDate, obtained: 0, max: 0 };
      entry.obtained += Number(mark.marksObtained);
      entry.max += mark.examSubject.maxMarks;
      examGroups.set(key, entry);
    }
  }
  const examResults = [...examGroups.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
  const latestExamPct = examResults[0] ? Math.round((examResults[0].obtained / examResults[0].max) * 100) : null;

  return (
    <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 16, height: "100dvh", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="disp" style={{ fontSize: 21 }}>
          Students <span className="mono" style={{ fontSize: 14, fontWeight: 500, color: "var(--faint)" }}>· {students.length}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <form method="GET" style={{ display: "flex", gap: 10 }}>
            {params.student && <input type="hidden" name="student" value={params.student} />}
            <input
              className="in"
              name="q"
              defaultValue={params.q}
              placeholder="Search students…"
              style={{ width: 220, background: "var(--card)" }}
            />
            <select className="in" name="classId" defaultValue={params.classId ?? ""} style={{ width: "auto", background: "var(--card)", fontWeight: 600 }}>
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.grade}-{c.section}
                </option>
              ))}
            </select>
            <select className="in" name="status" defaultValue={params.status ?? ""} style={{ width: "auto", background: "var(--card)", fontWeight: 600 }}>
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ALUMNI">Alumni</option>
            </select>
            <button type="submit" style={{ display: "none" }} />
          </form>
          <Link
            href="/app/students/new"
            style={{ background: "var(--marigold)", color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
          >
            + Add Student
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 16, flex: 1, minHeight: 0 }}>
        <div className="card" style={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2.3fr 1fr 0.9fr 1.3fr 1fr",
              padding: "14px 20px",
              borderBottom: "1px solid var(--line)",
              fontSize: 11,
              color: "var(--faint)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            <div>Student</div>
            <div>Adm. No.</div>
            <div>Class</div>
            <div>Parent</div>
            <div>Fee status</div>
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {students.length === 0 && (
              <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 13.5 }}>
                No students match these filters.
              </div>
            )}
            {students.map((s) => {
              const status = feeStatusForStudent(s.classId, s.feePayments);
              const style = FEE_STATUS_STYLE[status];
              const isSelected = s.id === selectedId;
              const search = new URLSearchParams();
              search.set("student", s.id);
              if (params.q) search.set("q", params.q);
              if (params.classId) search.set("classId", params.classId);
              if (params.status) search.set("status", params.status);
              const parent = s.parentLinks[0]?.parent;

              return (
                <Link
                  key={s.id}
                  href={`/app/students?${search.toString()}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2.3fr 1fr 0.9fr 1.3fr 1fr",
                    alignItems: "center",
                    padding: "13px 20px",
                    borderBottom: "1px solid var(--line)",
                    background: isSelected ? "var(--marigold-tint)" : "transparent",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#fff",
                        flex: "none",
                        background: avatarColorFor(s.id),
                      }}
                    >
                      {initials(s.name)}
                    </div>
                    <div>
                      <div style={{ fontWeight: isSelected ? 700 : 600, fontSize: 13.5 }}>{s.name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--faint)" }}>
                        {s.class.grade} · {s.class.section}
                      </div>
                    </div>
                  </div>
                  <div className="mono" style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    {s.admissionNo}
                  </div>
                  <div style={{ fontSize: 12.5 }}>
                    {s.class.grade}-{s.class.section}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{parent?.name ?? "—"}</div>
                  <div>
                    <span className="pill" style={{ background: style.bg, color: style.fg }}>
                      {style.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {selected ? (
          <StudentDetailTabs
            student={selected}
            attendancePct={attendancePct}
            attendanceTotals={attendanceTotals}
            examResults={examResults}
            latestExamGrade={latestExamPct !== null ? gradeFor(latestExamPct) : null}
            latestExamPct={latestExamPct}
            feeStructures={selectedFeeStructures}
          />
        ) : (
          <div className="card" style={{ padding: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
            No student selected.
          </div>
        )}
      </div>
    </div>
  );
}

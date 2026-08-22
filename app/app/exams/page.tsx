import Link from "next/link";
import { auth } from "@/auth";
import { getScopedDb } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";
import { daysUntil } from "@/lib/format";
import { gradeFor, gradeColor } from "@/lib/academic";
import ExamMarksGrid from "./ExamMarksGrid";

export default async function ExamsPage({ searchParams }: { searchParams: Promise<{ exam?: string; classId?: string }> }) {
  const session = await auth();
  const params = await searchParams;
  const sdb = await getScopedDb();

  if (session!.user.role === "PARENT") {
    return <ParentExamsView />;
  }

  const accessLevel = await requireModuleAccess("Exams", "VIEW");
  const canEdit = accessLevel === "EDIT" || accessLevel === "FULL";

  const currentYear = await sdb.academicYear.findFirst({ where: { isCurrent: true } });
  const exams = currentYear
    ? await sdb.exam.findMany({ where: { yearId: currentYear.id }, include: { class: true }, orderBy: { startDate: "asc" } })
    : [];

  const now = new Date();
  const selectedExam = exams.find((e) => e.id === params.exam) ?? exams.find((e) => e.endDate >= now) ?? exams[exams.length - 1];

  const classId = params.classId ?? selectedExam?.classId ?? "";

  const examSubjects = selectedExam
    ? await sdb.examSubject.findMany({ where: { examId: selectedExam.id }, include: { subject: true }, orderBy: { subject: { name: "asc" } } })
    : [];

  const students = classId
    ? await sdb.student.findMany({ where: { classId, status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } })
    : [];

  const marks = selectedExam
    ? await sdb.mark.findMany({ where: { examSubject: { examId: selectedExam.id }, studentId: { in: students.map((s) => s.id) } } })
    : [];
  const initialMarks: Record<string, Record<string, number>> = {};
  for (const m of marks) {
    initialMarks[m.studentId] = initialMarks[m.studentId] ?? {};
    initialMarks[m.studentId][m.examSubjectId] = Number(m.marksObtained);
  }

  return (
    <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 14, height: "100dvh", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="disp" style={{ fontSize: 21 }}>
          Exams {currentYear && <span style={{ fontSize: 14, fontWeight: 500, color: "var(--faint)" }}>· {currentYear.label}</span>}
        </div>
        {canEdit && (
          <Link href="/app/exams/new" style={{ background: "var(--marigold)", color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            + Schedule Exam
          </Link>
        )}
      </div>

      {exams.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
          No exams scheduled yet for {currentYear?.label ?? "this year"}.
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(3, exams.length)},1fr)`, gap: 13 }}>
            {exams.map((e) => {
              const isSelected = e.id === selectedExam?.id;
              const completed = e.endDate < now;
              const upcoming = e.startDate > now;
              return (
                <Link
                  key={e.id}
                  href={`/app/exams?exam=${e.id}&classId=${e.classId}`}
                  className="card"
                  style={{
                    padding: "13px 17px",
                    textDecoration: "none",
                    color: "inherit",
                    border: isSelected ? "2px solid var(--marigold)" : "1px solid var(--line)",
                    background: isSelected ? "var(--marigold-tint)" : "var(--card)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>{e.name}</div>
                    <span
                      className="pill"
                      style={
                        completed
                          ? { background: "var(--good-tint)", color: "var(--good)" }
                          : upcoming
                            ? { background: "var(--marigold-tint)", color: "var(--marigold-deep)" }
                            : { background: "var(--line)", color: "var(--faint)" }
                      }
                    >
                      {completed ? "Completed" : upcoming ? `Upcoming · ${daysUntil(e.startDate)}d` : "Ongoing"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink2)", marginTop: 4, fontWeight: 600 }}>
                    {e.startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – {e.endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · Class {e.class.grade}-{e.class.section}
                  </div>
                </Link>
              );
            })}
          </div>

          {selectedExam && (
            <ExamMarksGrid
              examId={selectedExam.id}
              examName={selectedExam.name}
              className={`${selectedExam.class.grade}-${selectedExam.class.section}`}
              students={students}
              examSubjects={examSubjects}
              initialMarks={initialMarks}
              canEdit={canEdit}
            />
          )}
        </>
      )}
    </div>
  );
}

async function ParentExamsView() {
  const session = await auth();
  const sdb = await getScopedDb();

  const parent = await sdb.parent.findUnique({
    where: { userId: session!.user.id },
    include: {
      studentLinks: {
        include: {
          student: {
            include: {
              class: true,
              marks: { include: { examSubject: { include: { exam: true, subject: true } } } },
            },
          },
        },
      },
    },
  });

  const students = parent?.studentLinks.map((l) => l.student) ?? [];

  return (
    <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="disp" style={{ fontSize: 21 }}>
        Exam Results
      </div>
      {students.length === 0 && <div style={{ color: "var(--muted)" }}>No students linked to your account.</div>}
      {students.map((s) => {
        const byExam = new Map<string, { name: string; date: Date; obtained: number; max: number }>();
        for (const m of s.marks) {
          const exam = m.examSubject.exam;
          const entry = byExam.get(exam.id) ?? { name: exam.name, date: exam.startDate, obtained: 0, max: 0 };
          entry.obtained += Number(m.marksObtained);
          entry.max += m.examSubject.maxMarks;
          byExam.set(exam.id, entry);
        }
        const results = [...byExam.values()].sort((a, b) => b.date.getTime() - a.date.getTime());

        return (
          <div key={s.id} className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 14 }}>
              {s.name} <span style={{ fontWeight: 500, fontSize: 12.5, color: "var(--muted)" }}>· Class {s.class.grade}-{s.class.section}</span>
            </div>
            {results.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 13.5 }}>No exam results recorded yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {results.map((r) => {
                  const pct = Math.round((r.obtained / r.max) * 100);
                  const grade = gradeFor(pct);
                  return (
                    <div key={r.name + r.date.toISOString()} style={{ display: "grid", gridTemplateColumns: "1.7fr 0.9fr 0.6fr auto", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--paper)", borderRadius: 8 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{r.name}</div>
                      <div className="mono" style={{ fontSize: 12.5, fontWeight: 700, textAlign: "right" }}>
                        {r.obtained} / {r.max}
                      </div>
                      <div className="mono" style={{ fontSize: 12.5, fontWeight: 700, textAlign: "right", color: gradeColor(grade) }}>
                        {pct}%
                      </div>
                      <span className="pill" style={{ background: "var(--paper)", color: gradeColor(grade), border: "1px solid var(--line)" }}>
                        {grade}
                      </span>
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

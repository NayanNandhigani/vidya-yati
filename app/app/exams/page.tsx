import Link from "next/link";
import { auth } from "@/auth";
import { getScopedDb } from "@/lib/tenant-db";
import { requireModuleAccess, getPermittedClassIds } from "@/lib/permissions";
import { daysUntil, studentName } from "@/lib/format";
import { gradeFor, gradeForScale, gradeColor } from "@/lib/academic";
import { hasFeature } from "@/lib/feature-flags";
import { getSeating, canViewExamResults } from "./depth-actions";
import ExamMarksGrid from "./ExamMarksGrid";
import ExamDepthPanel from "./ExamDepthPanel";

export default async function ExamsPage({ searchParams }: { searchParams: Promise<{ exam?: string; classId?: string }> }) {
  const session = await auth();
  const params = await searchParams;
  const sdb = await getScopedDb();

  if (session!.user.role === "PARENT") {
    return <ParentExamsView />;
  }

  // Same reasoning as Attendance/Students: a class-scoped staffer with no
  // school-wide row must still reach this page — only reject up front when
  // they have no permitted classes at all.
  const permittedClassIds = await getPermittedClassIds("Exams", "VIEW");
  if (permittedClassIds !== "ALL" && permittedClassIds.size === 0) {
    await requireModuleAccess("Exams", "VIEW");
  }

  const currentYear = await sdb.academicYear.findFirst({ where: { isCurrent: true }, include: { gradeScale: { include: { bands: true } } } });
  const gradeBands = currentYear?.gradeScale?.bands.map((b) => ({ label: b.label, minPercent: Number(b.minPercent), maxPercent: Number(b.maxPercent) })) ?? [];
  const examsRaw = currentYear
    ? await sdb.exam.findMany({ where: { yearId: currentYear.id }, include: { class: true }, orderBy: { startDate: "asc" } })
    : [];
  const exams = permittedClassIds === "ALL" ? examsRaw : examsRaw.filter((e) => permittedClassIds.has(e.classId));

  const now = new Date();
  const selectedExam = exams.find((e) => e.id === params.exam) ?? exams.find((e) => e.endDate >= now) ?? exams[exams.length - 1];

  const classId = params.classId ?? selectedExam?.classId ?? "";
  // Unlike Attendance's classId (near-always populated via a class picker),
  // selectedExam only exists once an exam has already been created — a
  // school's very first visit to this page, before scheduling anything,
  // has no selectedExam. Falling back to "NONE" there (as if the user had
  // no access) hid the "+ Schedule Exam" button behind a chicken-and-egg
  // deadlock for every school. Resolve the school-wide grant instead
  // (still correctly "FULL" for a School Admin, or a staff member's real
  // school-wide StaffPermission row, or "NONE" if they truly have none).
  const accessLevel = await requireModuleAccess("Exams", "VIEW", selectedExam?.classId);
  const canEdit = accessLevel === "EDIT" || accessLevel === "FULL";

  const examSubjects = selectedExam
    ? await sdb.examSubject.findMany({ where: { examId: selectedExam.id }, include: { subject: true }, orderBy: { subject: { name: "asc" } } })
    : [];

  const students = classId
    ? await sdb.student.findMany({ where: { classId, status: "ACTIVE" }, orderBy: [{ firstName: "asc" }, { surname: "asc" }], select: { id: true, firstName: true, surname: true } })
    : [];

  const marks = selectedExam
    ? await sdb.mark.findMany({ where: { examSubject: { examId: selectedExam.id }, studentId: { in: students.map((s) => s.id) } } })
    : [];
  const initialMarks: Record<string, Record<string, number>> = {};
  for (const m of marks) {
    initialMarks[m.studentId] = initialMarks[m.studentId] ?? {};
    initialMarks[m.studentId][m.examSubjectId] = Number(m.marksObtained);
  }

  const [showSeating, showResultRelease, rooms, school] = await Promise.all([
    hasFeature(session!.user.schoolId, "exams.seatingAndBulkMarks"),
    hasFeature(session!.user.schoolId, "exams.resultRelease"),
    sdb.room.findMany({ orderBy: { name: "asc" } }),
    sdb.school.findUnique({ where: { id: session!.user.schoolId! }, select: { resultsLockUntilFeesCleared: true } }),
  ]);
  const seating = selectedExam && showSeating ? await getSeating(selectedExam.id) : [];

  return (
    <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 14, height: "100dvh", boxSizing: "border-box", overflowY: "auto" }}>
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
              gradeBands={gradeBands}
            />
          )}
          {selectedExam && (
            <ExamDepthPanel
              examId={selectedExam.id}
              canEdit={canEdit}
              showSeating={showSeating}
              rooms={rooms.map((r) => ({ id: r.id, name: r.name }))}
              seating={seating}
              showResultRelease={showResultRelease}
              resultReleaseAt={selectedExam.resultReleaseAt?.toISOString() ?? null}
              feeLockEnabled={school?.resultsLockUntilFeesCleared ?? false}
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

  const currentYear = await sdb.academicYear.findFirst({ where: { isCurrent: true }, include: { gradeScale: { include: { bands: true } } } });
  const gradeBands = currentYear?.gradeScale?.bands.map((b) => ({ label: b.label, minPercent: Number(b.minPercent), maxPercent: Number(b.maxPercent) })) ?? [];
  const gradeForPct = (pct: number) => gradeForScale(pct, gradeBands) ?? gradeFor(pct);

  // Precompute per-exam visibility (release date / fee lock) before
  // rendering — canViewExamResults is async, so this can't happen inline
  // inside a .map() callback in the JSX below.
  const resultsByStudent = await Promise.all(
    students.map(async (s) => {
      const byExam = new Map<string, { examId: string; name: string; date: Date; obtained: number; max: number }>();
      for (const m of s.marks) {
        const exam = m.examSubject.exam;
        const entry = byExam.get(exam.id) ?? { examId: exam.id, name: exam.name, date: exam.startDate, obtained: 0, max: 0 };
        entry.obtained += Number(m.marksObtained);
        entry.max += m.examSubject.maxMarks;
        byExam.set(exam.id, entry);
      }
      const raw = [...byExam.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
      const results = await Promise.all(
        raw.map(async (r) => ({ ...r, ...(await canViewExamResults(r.examId, s.id)) }))
      );
      return { student: s, results };
    })
  );

  return (
    <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="disp" style={{ fontSize: 21 }}>
        Exam Results
      </div>
      {students.length === 0 && <div style={{ color: "var(--muted)" }}>No students linked to your account.</div>}
      {resultsByStudent.map(({ student: s, results }) => (
        <div key={s.id} className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 14 }}>
            {studentName(s)} <span style={{ fontWeight: 500, fontSize: 12.5, color: "var(--muted)" }}>· Class {s.class.grade}-{s.class.section}</span>
          </div>
          {results.length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: 13.5 }}>No exam results recorded yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {results.map((r) => {
                if (!r.visible) {
                  return (
                    <div key={r.name + r.date.toISOString()} style={{ padding: "10px 12px", background: "var(--paper)", borderRadius: 8 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{r.name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--warn)", marginTop: 2 }}>{r.reason}</div>
                    </div>
                  );
                }
                const pct = Math.round((r.obtained / r.max) * 100);
                const grade = gradeForPct(pct);
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
      ))}
    </div>
  );
}

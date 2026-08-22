"use client";

import { useState } from "react";
import { initials } from "@/lib/format";
import { avatarColorFor, gradeColor, FEE_STATUS_STYLE } from "@/lib/academic";
import type { AttendanceStatus } from "@prisma/client";

type StudentDetail = {
  id: string;
  name: string;
  dob: Date | null;
  gender: string | null;
  admissionNo: string;
  class: { grade: string; section: string };
  parentLinks: { parent: { name: string; phone: string | null } }[];
  transportAssignment: { route: { name: string } } | null;
  attendance: { date: Date; status: AttendanceStatus }[];
  feePayments: { amount: unknown; paidOn: Date; feeStructure: { term: string } }[];
};

type ExamResult = { examName: string; date: Date; obtained: number; max: number };

type Props = {
  student: StudentDetail;
  attendancePct: number | null;
  attendanceTotals: { PRESENT: number; ABSENT: number; HALF_DAY: number };
  examResults: ExamResult[];
  latestExamGrade: string | null;
  latestExamPct: number | null;
  feeStructures: { id: string; term: string; amount: unknown; dueDate: Date }[];
};

const TABS = ["Profile", "Attendance", "Fees", "Exams"] as const;

export default function StudentDetailTabs({
  student,
  attendancePct,
  attendanceTotals,
  examResults,
  latestExamGrade,
  latestExamPct,
  feeStructures,
}: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Profile");

  const totalDue = feeStructures.reduce((s, f) => s + Number(f.amount), 0);
  const totalPaid = student.feePayments.reduce((s, p) => s + Number(p.amount), 0);
  const totalDueRemaining = Math.max(0, totalDue - totalPaid);
  const paidStructureTerms = new Set(student.feePayments.map((p) => p.feeStructure.term));

  return (
    <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            fontSize: 17,
            background: avatarColorFor(student.id),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            color: "#fff",
            flex: "none",
          }}
        >
          {initials(student.name)}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16.5 }}>{student.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
            Class {student.class.grade}-{student.class.section} · Adm. No. {student.admissionNo}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, background: "var(--paper)", borderRadius: 8, padding: 4, marginBottom: 18 }}>
        {TABS.map((t) => (
          <span
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              textAlign: "center",
              padding: 7,
              fontSize: 12.5,
              borderRadius: 6,
              cursor: "pointer",
              userSelect: "none",
              color: tab === t ? "var(--ink)" : "var(--muted)",
              fontWeight: tab === t ? 700 : 400,
              background: tab === t ? "var(--card)" : "transparent",
              boxShadow: tab === t ? "0 1px 2px rgba(0,0,0,.06)" : "none",
            }}
          >
            {t}
          </span>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {tab === "Profile" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
              <StatBox label="Attendance" value={attendancePct === null ? "—" : `${attendancePct}%`} color="var(--teal)" />
              <StatBox label="Latest exam" value={latestExamGrade ?? "—"} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 13, fontSize: 13.5 }}>
              <Row label="Date of birth" value={student.dob ? student.dob.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"} />
              <Row label="Gender" value={student.gender ? student.gender[0] + student.gender.slice(1).toLowerCase() : "—"} />
              <Row label="Parent / guardian" value={student.parentLinks[0]?.parent.name ?? "—"} />
              <Row label="Contact" value={student.parentLinks[0]?.parent.phone ?? "—"} mono />
              <Row label="Transport route" value={student.transportAssignment?.route.name ?? "Not assigned"} last />
            </div>
          </>
        )}

        {tab === "Attendance" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
              <StatBox label="Present" value={attendanceTotals.PRESENT} color="var(--good)" />
              <StatBox label="Half day" value={attendanceTotals.HALF_DAY} color="var(--warn)" />
              <StatBox label="Absent" value={attendanceTotals.ABSENT} color="var(--critical)" />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
              <div style={{ fontSize: 11, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Last 15 recorded days</div>
              <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--teal)" }}>
                {attendancePct === null ? "No data" : `${attendancePct}% present`}
              </div>
            </div>
            {student.attendance.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 13, padding: "16px 0" }}>No attendance recorded yet.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
                {[...student.attendance].reverse().map((a, i) => {
                  const styleMap = {
                    PRESENT: { bg: "var(--good-tint)", fg: "var(--good)", mark: "P" },
                    ABSENT: { bg: "var(--critical-tint)", fg: "var(--critical)", mark: "A" },
                    HALF_DAY: { bg: "var(--warn-tint)", fg: "var(--warn)", mark: "H" },
                  } as const;
                  const s = styleMap[a.status];
                  return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, borderRadius: 6, padding: "7px 0", background: s.bg, color: s.fg }}>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 700 }}>
                        {a.date.getDate()}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", opacity: 0.85 }}>{s.mark}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === "Fees" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
              <StatBox label="Total fee" value={`₹${totalDue.toLocaleString("en-IN")}`} />
              <StatBox label="Paid" value={`₹${totalPaid.toLocaleString("en-IN")}`} color="var(--good)" />
              <StatBox label="Due" value={`₹${totalDueRemaining.toLocaleString("en-IN")}`} color="var(--warn)" />
            </div>
            <div style={{ fontSize: 11, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 9 }}>
              Installments
            </div>
            {feeStructures.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 13, padding: "16px 0" }}>No fee structure set for this class yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {feeStructures.map((fs) => {
                  const paid = paidStructureTerms.has(fs.term);
                  const overdue = !paid && fs.dueDate < new Date();
                  const status = paid ? "PAID" : overdue ? "OVERDUE" : "PENDING";
                  const style = FEE_STATUS_STYLE[status];
                  return (
                    <div
                      key={fs.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.6fr 0.9fr auto",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        background: "var(--paper)",
                        borderRadius: 8,
                        boxShadow: overdue ? "inset 3px 0 0 var(--critical)" : undefined,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{fs.term}</div>
                        <div style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 1 }}>
                          {paid ? "Paid" : `Due ${fs.dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`}
                        </div>
                      </div>
                      <div className="mono" style={{ fontSize: 12.5, fontWeight: 700, textAlign: "right" }}>
                        ₹{Number(fs.amount).toLocaleString("en-IN")}
                      </div>
                      <span className="pill" style={{ background: style.bg, color: style.fg }}>
                        {style.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === "Exams" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
              <StatBox label="Latest score" value={latestExamPct === null ? "—" : `${latestExamPct}%`} color="var(--teal)" />
              <StatBox label="Latest grade" value={latestExamGrade ?? "—"} />
              <StatBox label="Exams recorded" value={examResults.length} />
            </div>
            <div style={{ fontSize: 11, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 9 }}>
              Recent exams
            </div>
            {examResults.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 13, padding: "16px 0" }}>No exam results recorded yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {examResults.map((e) => {
                  const pct = Math.round((e.obtained / e.max) * 100);
                  const grade = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B+" : pct >= 60 ? "B" : pct >= 50 ? "C" : "D";
                  return (
                    <div key={e.examName + e.date.toISOString()} style={{ display: "grid", gridTemplateColumns: "1.7fr 0.9fr 0.6fr auto", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--paper)", borderRadius: 8 }}>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{e.examName}</div>
                        <div style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 1 }}>{e.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                      </div>
                      <div className="mono" style={{ fontSize: 12.5, fontWeight: 700, textAlign: "right" }}>
                        {e.obtained}
                        <span style={{ color: "var(--faint)", fontWeight: 500 }}> / {e.max}</span>
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
          </>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div style={{ background: "var(--paper)", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 10.5, color: "var(--faint)", marginBottom: 3 }}>{label}</div>
      <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: color ?? "var(--ink)" }}>
        {value}
      </div>
    </div>
  );
}

function Row({ label, value, mono, last }: { label: string; value: string; mono?: boolean; last?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: last ? undefined : "1px solid var(--line)", paddingBottom: last ? 0 : 10 }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span className={mono ? "mono" : undefined} style={{ fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}

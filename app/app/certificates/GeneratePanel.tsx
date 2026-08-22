"use client";

import { useMemo, useState, useTransition } from "react";
import { renderCertificateBody } from "@/lib/certificates";
import { issueCertificate } from "./actions";

type Template = { id: string; type: string; label: string; title: string; body: string; issuedCount: number };
type Student = { id: string; name: string; admissionNo: string; className: string };

export default function GeneratePanel({
  templates,
  students,
  schoolName,
  yearLabel,
  initialTemplateId,
  recentIssued,
}: {
  templates: Template[];
  students: Student[];
  schoolName: string;
  yearLabel: string;
  initialTemplateId: string;
  recentIssued: { studentName: string; templateLabel: string; issuedDate: string }[];
}) {
  const [templateId, setTemplateId] = useState(initialTemplateId);
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [issuedFlash, setIssuedFlash] = useState(false);

  const template = templates.find((t) => t.id === templateId) ?? templates[0];
  const student = students.find((s) => s.id === studentId);

  const preview = useMemo(() => {
    if (!template || !student) return "";
    return renderCertificateBody(template.body, { name: student.name, admissionNo: student.admissionNo, school: schoolName, class: student.className, year: yearLabel });
  }, [template, student, schoolName, yearLabel]);

  function issue() {
    if (!template || !student) return;
    startTransition(async () => {
      await issueCertificate(template.id, student.id);
      setIssuedFlash(true);
      setTimeout(() => setIssuedFlash(false), 2000);
    });
  }

  return (
    <div className="card" style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>Generate certificate</div>
        <span className="pill" style={{ background: "var(--marigold-tint)", color: "var(--marigold-deep)" }}>
          {template?.label}
        </span>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <select className="in" value={studentId} onChange={(e) => setStudentId(e.target.value)} style={{ flex: 1.3 }}>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.className}
            </option>
          ))}
        </select>
        <div className="in mono" style={{ flex: 1, background: "var(--paper)" }}>
          {yearLabel}
        </div>
      </div>

      <div style={{ border: "1px solid var(--marigold-tint)", borderRadius: 12, padding: 4 }}>
        <div style={{ border: "1px solid var(--line)", borderRadius: 9, padding: "22px 28px 24px", background: "#FFFEFB" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="disp" style={{ fontSize: 17 }}>
                {schoolName}
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: 9.5, color: "var(--muted)" }}>
              <div className="mono">Date: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
            </div>
          </div>
          <div style={{ height: 2, background: "linear-gradient(90deg,var(--marigold),var(--marigold-tint))", margin: "15px 0 16px" }} />
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <div className="disp" style={{ fontSize: 15, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {template?.title}
            </div>
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.8, color: "var(--ink2)", textAlign: "justify", whiteSpace: "pre-line" }}>{preview}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 26 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", border: "1.5px dashed var(--marigold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 6.5, color: "var(--marigold-deep)", fontWeight: 700, textAlign: "center", lineHeight: 1.3 }}>
              OFFICIAL
              <br />
              SEAL
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 140, borderTop: "1px solid var(--ink)", paddingTop: 5, fontSize: 11, fontWeight: 700 }}>Principal</div>
              <div style={{ fontSize: 9.5, color: "var(--muted)" }}>{schoolName}</div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={issue}
        disabled={pending || !student}
        style={{ background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1 }}
      >
        {pending ? "Issuing…" : issuedFlash ? "Issued ✓" : "Issue certificate"}
      </button>

      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
        <div style={{ fontSize: 10.5, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 9 }}>Recently generated</div>
        {recentIssued.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)" }}>None yet.</div>}
        {recentIssued.map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
            <span>
              <span style={{ fontWeight: 600 }}>{r.studentName}</span>
              <span style={{ color: "var(--muted)" }}> · {r.templateLabel}</span>
            </span>
            <span className="mono" style={{ color: "var(--faint)" }}>
              {new Date(r.issuedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

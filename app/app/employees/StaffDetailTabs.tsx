"use client";

import { useState, useTransition } from "react";
import { initials } from "@/lib/format";
import { avatarColorFor } from "@/lib/academic";
import type { AccessLevel } from "@prisma/client";
import { cyclePermission, runPayroll } from "./actions";

const MODULES = ["Students", "Employees", "Attendance", "Exams", "Homework", "Timetable", "Fees", "Accounts", "Admissions", "Transport", "Library", "Events", "Certificates", "Communication", "Reports"];

const LEVEL_STYLE: Record<AccessLevel, { bg: string; fg: string; label: string }> = {
  NONE: { bg: "var(--line)", fg: "var(--faint)", label: "No access" },
  VIEW: { bg: "var(--marigold-tint)", fg: "var(--marigold-deep)", label: "View only" },
  EDIT: { bg: "var(--teal-tint)", fg: "var(--teal)", label: "View + Edit" },
  FULL: { bg: "var(--good-tint)", fg: "var(--good)", label: "Full access" },
};

type Staff = {
  id: string;
  designation: string | null;
  department: string | null;
  dateJoined: string | null;
  employmentStatus: "ACTIVE" | "ON_LEAVE";
  user: { name: string; email: string; phone: string | null };
};

type Props = {
  staff: Staff;
  isAdmin: boolean;
  attendanceTotals: { PRESENT: number; ABSENT: number; HALF_DAY: number };
  recentAttendance: { date: string; status: "PRESENT" | "ABSENT" | "HALF_DAY" }[];
  payrollRuns: { month: string; amount: number; status: "PENDING" | "PAID"; paidOn: string | null }[];
  permissions: Record<string, AccessLevel>;
};

const TABS = ["Profile", "Attendance", "Payroll", "Access & Permissions"] as const;

export default function StaffDetailTabs({ staff, isAdmin, attendanceTotals, recentAttendance, payrollRuns, permissions }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Profile");
  const [perms, setPerms] = useState(permissions);
  const [pending, startTransition] = useTransition();
  const [payAmount, setPayAmount] = useState("");

  const attendanceTotal = attendanceTotals.PRESENT + attendanceTotals.ABSENT + attendanceTotals.HALF_DAY;
  const attendancePct = attendanceTotal ? Math.round((attendanceTotals.PRESENT / attendanceTotal) * 100) : null;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const latestPay = payrollRuns[0];

  function togglePerm(moduleName: string) {
    if (!isAdmin) return;
    startTransition(async () => {
      const res = await cyclePermission(staff.id, moduleName);
      setPerms((prev) => ({ ...prev, [moduleName]: res.accessLevel }));
    });
  }

  function pay() {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return;
    startTransition(async () => {
      await runPayroll(staff.id, currentMonth, amount);
      setPayAmount("");
    });
  }

  return (
    <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", fontSize: 17, background: avatarColorFor(staff.id), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", flex: "none" }}>
          {initials(staff.user.name)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 16.5 }}>{staff.user.name}</div>
            <span className="pill" style={{ background: staff.employmentStatus === "ACTIVE" ? "var(--good-tint)" : "var(--warn-tint)", color: staff.employmentStatus === "ACTIVE" ? "var(--good)" : "var(--warn)" }}>
              {staff.employmentStatus === "ACTIVE" ? "Active" : "On Leave"}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
            {staff.designation ?? "—"} {staff.department && `· ${staff.department}`}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, background: "var(--paper)", borderRadius: 8, padding: 4, marginBottom: 16 }}>
        {TABS.map((t) => (
          <span
            key={t}
            onClick={() => setTab(t)}
            style={{ flex: t === "Access & Permissions" ? 1.4 : 1, textAlign: "center", padding: "7px 2px", fontSize: 12, borderRadius: 6, cursor: "pointer", userSelect: "none", color: tab === t ? "var(--ink)" : "var(--muted)", fontWeight: tab === t ? 700 : 400, background: tab === t ? "var(--card)" : "transparent", boxShadow: tab === t ? "0 1px 2px rgba(0,0,0,.06)" : "none" }}
          >
            {t}
          </span>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {tab === "Profile" && (
          <>
            <SectionTitle>Employment</SectionTitle>
            <FieldGrid>
              <Field label="Designation" value={staff.designation ?? "—"} />
              <Field label="Department" value={staff.department ?? "—"} />
              <Field label="Date of Joining" value={staff.dateJoined ? new Date(staff.dateJoined).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"} />
              <Field label="Status" value={staff.employmentStatus === "ACTIVE" ? "Active" : "On Leave"} />
            </FieldGrid>
            <SectionTitle>Contact</SectionTitle>
            <FieldGrid>
              <Field label="Phone" value={staff.user.phone ?? "—"} mono />
              <Field label="Email" value={staff.user.email} mono />
            </FieldGrid>
          </>
        )}

        {tab === "Attendance" && (
          <>
            <SectionTitle>All-time</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
              <StatTile label="Present Days" value={attendanceTotals.PRESENT} color="var(--good)" />
              <StatTile label="Absent" value={attendanceTotals.ABSENT} color="var(--critical)" />
              <StatTile label="Half day" value={attendanceTotals.HALF_DAY} color="var(--warn)" />
              <StatTile label="Attendance" value={attendancePct === null ? "—" : `${attendancePct}%`} />
            </div>
            <SectionTitle>Last recorded days</SectionTitle>
            {recentAttendance.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 13 }}>No attendance recorded yet.</div>
            ) : (
              recentAttendance.map((a, i) => {
                const style = a.status === "PRESENT" ? { bg: "var(--good-tint)", fg: "var(--good)", label: "Present" } : a.status === "ABSENT" ? { bg: "var(--critical-tint)", fg: "var(--critical)", label: "Absent" } : { bg: "var(--warn-tint)", fg: "var(--warn)", label: "Half day" };
                const d = new Date(a.date);
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 12.5 }}>
                    <div>
                      <span style={{ color: "var(--ink2)", fontWeight: 600 }}>{d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                      <span style={{ color: "var(--faint)", fontSize: 11.5, marginLeft: 6 }}>{d.toLocaleDateString("en-IN", { weekday: "short" })}</span>
                    </div>
                    <span className="pill" style={{ background: style.bg, color: style.fg }}>
                      {style.label}
                    </span>
                  </div>
                );
              })
            )}
          </>
        )}

        {tab === "Payroll" && (
          <>
            <SectionTitle>Run payroll — {currentMonth}</SectionTitle>
            {isAdmin && (
              <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                <input className="in mono" type="number" placeholder="Amount" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} style={{ flex: 1 }} />
                <button onClick={pay} disabled={pending} style={{ background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 8, padding: "0 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Pay
                </button>
              </div>
            )}
            {latestPay && (
              <div style={{ background: "var(--good-tint)", borderRadius: 8, padding: "12px 14px", margin: "0 0 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--good)" }}>Latest — {latestPay.month}</span>
                <span className="mono" style={{ fontSize: 19, fontWeight: 700, color: "var(--good)" }}>
                  ₹{latestPay.amount.toLocaleString("en-IN")}
                </span>
              </div>
            )}
            <SectionTitle>Payslips</SectionTitle>
            {payrollRuns.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 13 }}>No payroll runs yet.</div>
            ) : (
              payrollRuns.map((p) => (
                <div key={p.month} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.month}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="mono" style={{ fontSize: 12.5, color: "var(--muted)" }}>
                      ₹{p.amount.toLocaleString("en-IN")}
                    </span>
                    <span className="pill" style={{ background: p.status === "PAID" ? "var(--good-tint)" : "var(--warn-tint)", color: p.status === "PAID" ? "var(--good)" : "var(--warn)" }}>
                      {p.status === "PAID" ? "Paid" : "Pending"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {tab === "Access & Permissions" && (
          <>
            <div style={{ background: "var(--teal-tint)", borderRadius: 8, padding: "10px 12px", fontSize: 11.5, color: "var(--teal)", marginBottom: 14, lineHeight: 1.4 }}>
              Access is granted per module, not by a fixed role. {isAdmin ? "Click a permission to cycle its level." : "Only a School Admin can change these."}
            </div>
            {MODULES.map((m) => {
              const level = perms[m] ?? "NONE";
              const style = LEVEL_STYLE[level];
              return (
                <div key={m} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10.5px 0", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{m}</div>
                  <span className="pill" onClick={() => togglePerm(m)} style={{ background: style.bg, color: style.fg, cursor: isAdmin ? "pointer" : "default" }}>
                    {style.label}
                  </span>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "18px 0 10px" }}>{children}</div>;
}
function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 18px" }}>{children}</div>;
}
function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{label}</div>
      <div className={mono ? "mono" : undefined} style={{ fontSize: 13, fontWeight: 600 }}>
        {value}
      </div>
    </div>
  );
}
function StatTile({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: "11px 13px" }}>
      <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 5 }}>{label}</div>
      <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: color ?? "var(--ink)" }}>
        {value}
      </div>
    </div>
  );
}

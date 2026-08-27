"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { logReminder, markLost } from "./actions";

export type AttentionRow = {
  schoolId: string;
  schoolName: string;
  category: "overdue" | "renewal_due" | "low_activity_trial";
  detail: string;
  severity: "critical" | "warn";
};

const SEVERITY_STYLE: Record<AttentionRow["severity"], string> = {
  critical: "var(--critical)",
  warn: "var(--warn)",
};

function ActionRow({ row }: { row: AttentionRow }) {
  const [pending, startTransition] = useTransition();
  const [reminded, setReminded] = useState(false);
  const [lost, setLost] = useState(false);

  function onRemind() {
    startTransition(async () => {
      await logReminder(row.schoolId);
      setReminded(true);
    });
  }
  function onMarkLost() {
    startTransition(async () => {
      await markLost(row.schoolId);
      setLost(true);
    });
  }

  if (lost) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: SEVERITY_STYLE[row.severity], flex: "none" }} />
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{row.schoolName}</span>
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}> — {row.detail}</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
        {reminded ? (
          <span style={{ fontSize: 11.5, color: "var(--good)", fontWeight: 600 }}>Reminded ✓</span>
        ) : (
          <span onClick={onRemind} style={{ cursor: pending ? "default" : "pointer", fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
            Send reminder
          </span>
        )}
        {row.category === "low_activity_trial" ? (
          <span onClick={onMarkLost} style={{ cursor: pending ? "default" : "pointer", fontSize: 12, fontWeight: 600, color: "var(--critical)" }}>
            Mark lost
          </span>
        ) : (
          <Link href={`/super-admin/subscriptions?school=${row.schoolId}`} style={{ fontSize: 12.5, fontWeight: 700, color: "var(--marigold-deep)", textDecoration: "none" }}>
            Review →
          </Link>
        )}
      </div>
    </div>
  );
}

export default function AttentionList({ rows }: { rows: AttentionRow[] }) {
  if (rows.length === 0) {
    return <div style={{ fontSize: 13, color: "var(--good)", fontWeight: 600 }}>✓ All clear — no payments, renewals, or at-risk trials right now.</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {rows.map((row) => (
        <ActionRow key={row.schoolId + row.category} row={row} />
      ))}
    </div>
  );
}

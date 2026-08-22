"use client";

import { useActionState, useEffect, useState } from "react";
import { recordPayment, type PaymentFormState } from "./actions";

type Row = {
  id: string;
  name: string;
  className: string;
  total: number;
  paid: number;
  pending: number;
  status: "PAID" | "PENDING" | "OVERDUE" | "NONE";
  recentPayments: { paidOn: string; method: string; amount: number }[];
};

const STATUS_STYLE = {
  PAID: { bg: "var(--good-tint)", fg: "var(--good)", label: "Paid" },
  PENDING: { bg: "var(--warn-tint)", fg: "var(--warn)", label: "Pending" },
  OVERDUE: { bg: "#fff", fg: "var(--critical)", label: "Overdue" },
  NONE: { bg: "var(--line)", fg: "var(--muted)", label: "No dues" },
} as const;

function formatINR(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

const initialState: PaymentFormState = {};

export default function FeesView({ rows, canEdit }: { rows: Row[]; canEdit: boolean }) {
  const [selected, setSelected] = useState<Row | null>(null);
  const [state, formAction, pending] = useActionState(recordPayment, initialState);

  useEffect(() => {
    if (state.success) setSelected(null);
  }, [state.success]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16, flex: 1, minHeight: 0 }}>
      <div className="card" style={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", padding: "13px 20px", borderBottom: "1px solid var(--line)", fontSize: 10.5, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          <div>Student</div>
          <div>Class</div>
          <div>Total</div>
          <div>Paid</div>
          <div>Pending</div>
          <div>Status</div>
        </div>
        <div style={{ overflowY: "auto" }}>
          {rows.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>No students found.</div>}
          {rows.map((r) => {
            const style = STATUS_STYLE[r.status];
            const isSelected = selected?.id === r.id;
            return (
              <div
                key={r.id}
                onClick={() => canEdit && setSelected(r)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
                  alignItems: "center",
                  padding: "12px 20px",
                  borderBottom: "1px solid var(--line)",
                  fontSize: 13,
                  cursor: canEdit ? "pointer" : "default",
                  boxShadow: isSelected ? "inset 3px 0 0 var(--marigold)" : undefined,
                  background: r.status === "OVERDUE" ? "var(--critical-tint)" : "transparent",
                }}
              >
                <div style={{ fontWeight: isSelected ? 700 : 600 }}>{r.name}</div>
                <div style={{ color: "var(--muted)" }}>{r.className}</div>
                <div className="mono">{formatINR(r.total)}</div>
                <div className="mono" style={{ color: r.paid > 0 ? "var(--good)" : undefined }}>
                  {formatINR(r.paid)}
                </div>
                <div className="mono" style={{ color: r.pending > 0 ? style.fg : "var(--faint)", fontWeight: r.status === "OVERDUE" ? 700 : 400 }}>
                  {formatINR(r.pending)}
                </div>
                <div>
                  <span className="pill" style={{ background: style.bg, color: style.fg }}>
                    {style.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {canEdit && (
        <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16, position: "relative" }}>
          {selected ? (
            <>
              <span onClick={() => setSelected(null)} style={{ position: "absolute", top: 14, right: 14, width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "var(--muted)", cursor: "pointer" }}>
                ×
              </span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>Record a payment</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {selected.name} · {selected.className} · {formatINR(selected.pending)} pending
                </div>
              </div>
              <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <input type="hidden" name="studentId" value={selected.id} />
                <label className="field">
                  Amount received
                  <input className="in mono" name="amount" type="number" min={0} step={1} placeholder="0" required />
                </label>
                <label className="field">
                  Payment method
                  <select className="in" name="method" defaultValue="Bank Transfer">
                    <option>Bank Transfer</option>
                    <option>UPI</option>
                    <option>Cash</option>
                    <option>Cheque</option>
                    <option>Card</option>
                  </select>
                </label>
                <label className="field">
                  Reference / receipt no.
                  <input className="in mono" name="referenceNo" type="text" placeholder="TXN-88213" />
                </label>
                <label className="field">
                  Date received
                  <input className="in mono" name="paidOn" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
                </label>
                {state.error && (
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--critical)", background: "var(--critical-tint)", border: "1px solid var(--critical-border)", borderRadius: 8, padding: "8px 11px" }}>
                    {state.error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={pending}
                  style={{ background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 8, padding: 10, textAlign: "center", fontSize: 13.5, fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1 }}
                >
                  {pending ? "Recording…" : "Record Payment"}
                </button>
              </form>
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, marginTop: 2 }}>
                <div style={{ fontSize: 11.5, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Recent payments</div>
                {selected.recentPayments.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: "var(--muted)" }}>No payments recorded yet.</div>
                ) : (
                  selected.recentPayments.map((p, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 8 }}>
                      <span style={{ color: "var(--muted)" }}>
                        {new Date(p.paidOn).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} · {p.method}
                      </span>
                      <span className="mono" style={{ fontWeight: 600 }}>
                        {formatINR(p.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 13.5, display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>Select a student to record a payment.</div>
          )}
        </div>
      )}
    </div>
  );
}

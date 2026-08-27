"use client";

import { useActionState, useEffect, useState } from "react";
import { recordBillPayment, type AccountsFormState } from "./actions";
import { formatINR } from "@/lib/format";

const initialState: AccountsFormState = {};

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  PENDING: { bg: "var(--info-tint)", fg: "var(--info)", label: "Pending" },
  PARTIALLY_PAID: { bg: "var(--warn-tint)", fg: "var(--warn)", label: "Partially paid" },
  PAID: { bg: "var(--good-tint)", fg: "var(--good)", label: "Paid" },
  OVERDUE: { bg: "var(--critical-tint)", fg: "var(--critical)", label: "Overdue" },
  CANCELLED: { bg: "var(--line)", fg: "var(--faint)", label: "Cancelled" },
};

const RECURRENCE_LABEL: Record<string, string> = { NONE: "One-time", MONTHLY: "Monthly", QUARTERLY: "Quarterly", YEARLY: "Yearly" };

export type BillRowData = {
  id: string;
  billNumber: string;
  vendorName: string;
  categoryName: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: string;
  recurrence: string;
  isOverdue: boolean;
};

export default function BillRow({ bill }: { bill: BillRowData }) {
  const formatAmount = formatINR;
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(recordBillPayment, initialState);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  const style = bill.isOverdue ? STATUS_STYLE.OVERDUE : STATUS_STYLE[bill.status];
  const balance = bill.amount - bill.paidAmount;

  return (
    <div style={{ borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.2fr 1fr 1fr 1fr 0.9fr", alignItems: "center", padding: "12px 0", fontSize: 13 }}>
        <div>
          <div style={{ fontWeight: 600 }}>{bill.vendorName}</div>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>
            {bill.billNumber}
          </div>
        </div>
        <div style={{ color: "var(--muted)" }}>{bill.categoryName}</div>
        <div className="mono">{formatAmount(bill.amount)}</div>
        <div className="mono" style={{ color: "var(--muted)" }}>
          {new Date(bill.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        </div>
        <div>
          <span className="pill" style={{ background: style.bg, color: style.fg }}>
            {style.label}
          </span>
          {bill.recurrence !== "NONE" && (
            <span className="mono" style={{ fontSize: 10, color: "var(--faint)", marginLeft: 6 }}>
              ↻ {RECURRENCE_LABEL[bill.recurrence]}
            </span>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          {bill.status !== "PAID" && bill.status !== "CANCELLED" ? (
            <span onClick={() => setOpen(!open)} style={{ cursor: "pointer", color: "var(--marigold-deep)", fontWeight: 600, fontSize: 12 }}>
              {open ? "Close" : "Record payment"}
            </span>
          ) : (
            <span style={{ color: "var(--faint)", fontSize: 12 }}>—</span>
          )}
        </div>
      </div>

      {open && (
        <form action={formAction} style={{ display: "flex", gap: 8, alignItems: "flex-end", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <input type="hidden" name="billId" value={bill.id} />
          <label className="field" style={{ flex: 1 }}>
            Amount (balance {formatAmount(balance)})
            <input className="in mono" type="number" name="amount" min="0" step="0.01" defaultValue={balance > 0 ? balance : undefined} required />
          </label>
          <label className="field" style={{ flex: 1 }}>
            Method
            <input className="in" name="method" placeholder="Bank transfer / UPI" required />
          </label>
          <label className="field" style={{ flex: 1 }}>
            Paid on
            <input className="in" type="date" name="paidOn" defaultValue={new Date().toISOString().slice(0, 10)} />
          </label>
          <label className="field" style={{ flex: 1 }}>
            Reference no.
            <input className="in mono" name="referenceNo" />
          </label>
          <button type="submit" disabled={pending} style={{ background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: pending ? "default" : "pointer" }}>
            {pending ? "Saving…" : "Save"}
          </button>
        </form>
      )}
      {open && state.error && (
        <p style={{ margin: "-6px 0 12px", fontSize: 12, fontWeight: 600, color: "var(--critical)" }}>{state.error}</p>
      )}
    </div>
  );
}

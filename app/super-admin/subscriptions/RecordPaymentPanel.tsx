"use client";

import { useActionState } from "react";
import { formatINR } from "@/lib/format";
import { recordSubscriptionPayment, type PaymentFormState } from "./actions";

type Invoice = { id: string; schoolName: string; billingPeriod: string; amount: number; dueDate: string; status: string; paidAmount: number };

const initialState: PaymentFormState = {};

export default function RecordPaymentPanel({ invoice }: { invoice: Invoice }) {
  const [state, formAction, pending] = useActionState(recordSubscriptionPayment, initialState);

  const remaining = Math.max(0, invoice.amount - invoice.paidAmount);
  const isOverdue = invoice.status !== "PAID" && new Date(invoice.dueDate) < new Date();

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>Record a payment</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>Apply a payment against an outstanding invoice.</div>

      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: "12px 14px", marginBottom: 14, flex: "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>{invoice.schoolName}</div>
          <span className="pill" style={{ background: isOverdue ? "var(--critical-tint)" : "var(--warn-tint)", color: isOverdue ? "var(--critical)" : "var(--warn)" }}>
            {isOverdue ? "Overdue" : invoice.status === "PAID" ? "Paid" : "Pending"}
          </span>
        </div>
        <Row label="Billing period" value={invoice.billingPeriod} />
        <Row label="Amount due" value={formatINR(remaining)} bold />
        <Row label="Due date" value={new Date(invoice.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
      </div>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 11, overflowY: "auto", flex: 1, minHeight: 0 }}>
        <input type="hidden" name="invoiceId" value={invoice.id} />
        <label className="field">
          Amount received (₹)
          <input className="in mono" name="amount" type="number" min={0} defaultValue={remaining || undefined} required />
        </label>
        <label className="field">
          Payment method
          <select className="in" name="method" defaultValue="Bank Transfer">
            <option>Bank Transfer</option>
            <option>UPI</option>
            <option>Cheque</option>
            <option>Cash</option>
            <option>Card</option>
          </select>
        </label>
        <label className="field">
          Payment date
          <input className="in mono" type="date" name="paidOn" defaultValue={new Date().toISOString().slice(0, 10)} />
        </label>
        <label className="field">
          Reference / UTR number
          <input className="in mono" name="referenceNo" placeholder="e.g. UTR2216480091" />
        </label>

        {state.error && (
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--critical)", background: "var(--critical-tint)", border: "1px solid var(--critical-border)", borderRadius: 8, padding: "8px 11px" }}>
            {state.error}
          </p>
        )}
        {state.success && (
          <p style={{ margin: 0, background: "var(--good-tint)", color: "var(--good)", borderRadius: 8, padding: "9px 12px", fontSize: 12.5, fontWeight: 700, textAlign: "center" }}>Payment recorded ✓</p>
        )}

        <button type="submit" disabled={pending} style={{ flex: "none", textAlign: "center", background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", fontSize: 13.5, fontWeight: 700, cursor: pending ? "default" : "pointer", marginTop: 4 }}>
          {pending ? "Recording…" : "Record payment"}
        </button>
      </form>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", padding: "3px 0" }}>
      <span>{label}</span>
      <span className="mono" style={{ color: "var(--ink)", fontWeight: bold ? 600 : 400 }}>
        {value}
      </span>
    </div>
  );
}

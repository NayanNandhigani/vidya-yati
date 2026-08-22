"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createInvoice, type InvoiceFormState } from "../actions";

const initialState: InvoiceFormState = {};

export default function NewInvoiceForm({ schools }: { schools: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createInvoice, initialState);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 440 }}>
      <label className="field">
        School
        <select className="in" name="schoolId" required defaultValue="">
          <option value="" disabled>
            Select school
          </option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Billing period
        <input className="in" name="billingPeriod" required placeholder="2026-27" />
      </label>
      <label className="field">
        Amount (₹)
        <input className="in mono" type="number" name="amount" required min={0} placeholder="185000" />
      </label>
      <label className="field">
        Due date
        <input className="in mono" type="date" name="dueDate" required />
      </label>
      {state.error && (
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--critical)", background: "var(--critical-tint)", border: "1px solid var(--critical-border)", borderRadius: 8, padding: "8px 11px" }}>
          {state.error}
        </p>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" disabled={pending} style={{ background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, cursor: pending ? "default" : "pointer" }}>
          {pending ? "Creating…" : "Create invoice"}
        </button>
        <Link href="/super-admin/subscriptions" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: "9px 18px", fontSize: 13.5, fontWeight: 600, textDecoration: "none", color: "var(--ink)" }}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

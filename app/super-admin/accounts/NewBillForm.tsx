"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createBill, type AccountsFormState } from "./actions";

const initialState: AccountsFormState = {};

type Option = { id: string; name: string };

export default function NewBillForm({ vendors, expenseAccounts }: { vendors: Option[]; expenseAccounts: Option[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createBill, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state.success]);

  if (!open) {
    return (
      <span onClick={() => setOpen(true)} style={{ cursor: "pointer", background: "var(--marigold)", color: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 12.5, fontWeight: 700 }}>
        + Schedule a bill
      </span>
    );
  }

  return (
    <form ref={formRef} action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: 14, marginBottom: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <label className="field">
          Vendor
          <select className="in" name="vendorId" required defaultValue="">
            <option value="" disabled>
              Choose vendor…
            </option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Category
          <select className="in" name="ledgerAccountId" required defaultValue="">
            <option value="" disabled>
              Choose category…
            </option>
            {expenseAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Bill number
          <input className="in mono" name="billNumber" placeholder="auto-generated if blank" />
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
        <label className="field">
          Amount (₹)
          <input className="in mono" type="number" name="amount" min="0" step="0.01" required />
        </label>
        <label className="field">
          Issue date
          <input className="in" type="date" name="issueDate" defaultValue={new Date().toISOString().slice(0, 10)} />
        </label>
        <label className="field">
          Due date
          <input className="in" type="date" name="dueDate" required />
        </label>
        <label className="field">
          Recurs
          <select className="in" name="recurrence" defaultValue="NONE">
            <option value="NONE">One-time</option>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </label>
      </div>
      <label className="field">
        Notes
        <textarea className="in" name="notes" rows={2} style={{ resize: "vertical", fontFamily: "inherit" }} />
      </label>
      {state.error && <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: "var(--critical)" }}>{state.error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={pending} style={{ background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: pending ? "default" : "pointer" }}>
          {pending ? "Saving…" : "Schedule bill"}
        </button>
        <span onClick={() => setOpen(false)} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
          Cancel
        </span>
      </div>
    </form>
  );
}

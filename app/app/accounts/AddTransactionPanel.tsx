"use client";

import { useActionState, useEffect, useState } from "react";
import { addTransaction, type TransactionFormState } from "./actions";

const initialState: TransactionFormState = {};

export default function AddTransactionPanel() {
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [state, formAction, pending] = useActionState(addTransaction, initialState);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (state.success) setKey((k) => k + 1); // reset uncontrolled fields after a successful submit
  }, [state.success]);

  return (
    <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 15 }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>Add transaction</div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>Manual entries only — fee payments and payroll sync in automatically</div>
      </div>

      <div style={{ display: "flex", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: 3 }}>
        <span
          onClick={() => setType("INCOME")}
          style={{ flex: 1, textAlign: "center", padding: 7, borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: "pointer", background: type === "INCOME" ? "var(--teal)" : "transparent", color: type === "INCOME" ? "#fff" : "var(--faint)" }}
        >
          Income
        </span>
        <span
          onClick={() => setType("EXPENSE")}
          style={{ flex: 1, textAlign: "center", padding: 7, borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: "pointer", background: type === "EXPENSE" ? "var(--clay)" : "transparent", color: type === "EXPENSE" ? "#fff" : "var(--faint)" }}
        >
          Expense
        </span>
      </div>

      <form key={key} action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <input type="hidden" name="type" value={type} />
        <label className="field">
          Date
          <input className="in mono" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </label>
        <label className="field">
          Description
          <input className="in" name="description" type="text" placeholder="Generator fuel — August" required />
        </label>
        <label className="field">
          Category
          <select className="in" name="category" defaultValue="Maintenance">
            <option>Maintenance</option>
            <option>Utilities</option>
            <option>Supplies</option>
            <option>Events</option>
            <option>Facilities</option>
            <option>Transport</option>
            <option>Other</option>
          </select>
        </label>
        <label className="field">
          Amount
          <input className="in mono" name="amount" type="number" min={0} step={1} placeholder="0" required />
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
          {pending ? "Adding…" : "Add Transaction"}
        </button>
      </form>
    </div>
  );
}

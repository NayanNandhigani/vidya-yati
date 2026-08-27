"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createLedgerAccount, type AccountsFormState } from "./actions";

const initialState: AccountsFormState = {};

export default function NewLedgerAccountForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createLedgerAccount, initialState);
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
        + New account
      </span>
    );
  }

  return (
    <form ref={formRef} action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: 14, marginBottom: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
        <label className="field">
          Name
          <input className="in" name="name" required placeholder="e.g. Travel & Conveyance" />
        </label>
        <label className="field">
          Type
          <select className="in" name="type" defaultValue="EXPENSE">
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
            <option value="ASSET">Asset</option>
            <option value="LIABILITY">Liability</option>
          </select>
        </label>
        <label className="field">
          Code
          <input className="in mono" name="code" placeholder="e.g. 5700" />
        </label>
      </div>
      {state.error && <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: "var(--critical)" }}>{state.error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={pending} style={{ background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: pending ? "default" : "pointer" }}>
          {pending ? "Adding…" : "Add account"}
        </button>
        <span onClick={() => setOpen(false)} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
          Cancel
        </span>
      </div>
    </form>
  );
}

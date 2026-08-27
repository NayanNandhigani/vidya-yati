"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { recordInboundPayment, recordOutboundPayment, type AccountsFormState } from "./actions";

const initialState: AccountsFormState = {};

type Option = { id: string; name: string };

function EntryForm({
  action,
  title,
  buttonLabel,
  accounts,
  vendors,
}: {
  action: (state: AccountsFormState, formData: FormData) => Promise<AccountsFormState>;
  title: string;
  buttonLabel: string;
  accounts: Option[];
  vendors?: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state.success]);

  if (!open) {
    return (
      <span onClick={() => setOpen(true)} style={{ cursor: "pointer", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 14px", fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>
        {buttonLabel}
      </span>
    );
  }

  return (
    <form ref={formRef} action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: 14, marginBottom: 14, flex: 1, minWidth: 280 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700 }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: vendors ? "1fr 1fr" : "1fr", gap: 10 }}>
        <label className="field">
          Category
          <select className="in" name="ledgerAccountId" required defaultValue="">
            <option value="" disabled>
              Choose category…
            </option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        {vendors && (
          <label className="field">
            Vendor (optional)
            <select className="in" name="vendorId" defaultValue="">
              <option value="">—</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <label className="field">
        Description
        <input className="in" name="description" required placeholder="e.g. Office internet — August" />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label className="field">
          Amount (₹)
          <input className="in mono" type="number" name="amount" min="0" step="0.01" required />
        </label>
        <label className="field">
          Date
          <input className="in" type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label className="field">
          Method
          <input className="in" name="method" placeholder="Bank transfer / UPI / Cash" />
        </label>
        <label className="field">
          Reference no.
          <input className="in mono" name="referenceNo" />
        </label>
      </div>
      {state.error && <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: "var(--critical)" }}>{state.error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={pending} style={{ background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: pending ? "default" : "pointer" }}>
          {pending ? "Saving…" : "Save"}
        </button>
        <span onClick={() => setOpen(false)} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
          Cancel
        </span>
      </div>
    </form>
  );
}

export function InboundPaymentForm({ incomeAccounts }: { incomeAccounts: Option[] }) {
  return <EntryForm action={recordInboundPayment} title="Record inbound payment" buttonLabel="+ Inbound payment" accounts={incomeAccounts} />;
}

export function OutboundPaymentForm({ expenseAccounts, vendors }: { expenseAccounts: Option[]; vendors: Option[] }) {
  return <EntryForm action={recordOutboundPayment} title="Record outbound payment" buttonLabel="+ Outbound payment" accounts={expenseAccounts} vendors={vendors} />;
}

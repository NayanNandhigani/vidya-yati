"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createVendor, type AccountsFormState } from "./actions";

const initialState: AccountsFormState = {};

export default function NewVendorForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createVendor, initialState);
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
        + New vendor
      </span>
    );
  }

  return (
    <form ref={formRef} action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: 14, marginBottom: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label className="field">
          Vendor name
          <input className="in" name="name" required placeholder="e.g. Amazon Web Services" />
        </label>
        <label className="field">
          Category
          <input className="in" name="category" placeholder="e.g. Hosting" />
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <label className="field">
          Contact name
          <input className="in" name="contactName" placeholder="e.g. Support team" />
        </label>
        <label className="field">
          Phone
          <input className="in mono" name="phone" placeholder="+91 …" />
        </label>
        <label className="field">
          Email
          <input className="in" type="email" name="email" placeholder="billing@vendor.com" />
        </label>
      </div>
      <label className="field">
        Notes
        <textarea className="in" name="notes" rows={2} style={{ resize: "vertical", fontFamily: "inherit" }} />
      </label>
      {state.error && <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: "var(--critical)" }}>{state.error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={pending} style={{ background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: pending ? "default" : "pointer" }}>
          {pending ? "Adding…" : "Add vendor"}
        </button>
        <span onClick={() => setOpen(false)} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
          Cancel
        </span>
      </div>
    </form>
  );
}

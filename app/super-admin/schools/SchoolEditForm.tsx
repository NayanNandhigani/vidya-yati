"use client";

import { useActionState, useEffect, useState } from "react";
import { updateSchool, type ManageFormState } from "./actions";

const initialState: ManageFormState = {};

const PLAN_OPTIONS: { value: string; label: string }[] = [
  { value: "STANDARD", label: "Standard" },
  { value: "PREMIUM", label: "Premium" },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "TRIAL", label: "Trial" },
  { value: "ACTIVE", label: "Active" },
  { value: "EXPIRING", label: "Expiring soon" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
];

type School = {
  id: string;
  name: string;
  code: string;
  city: string | null;
  state: string | null;
  plan: string;
  status: string;
};

export default function SchoolEditForm({ school }: { school: School }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateSchool, initialState);

  useEffect(() => {
    if (state.success) setEditing(false);
  }, [state.success]);

  if (!editing) {
    return (
      <span onClick={() => setEditing(true)} style={{ cursor: "pointer", color: "var(--marigold-deep)", fontSize: 12.5, fontWeight: 600 }}>
        Edit details
      </span>
    );
  }

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: 14, marginTop: 10 }}>
      <input type="hidden" name="id" value={school.id} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label className="field">
          School name
          <input className="in" name="name" defaultValue={school.name} required />
        </label>
        <label className="field">
          School code
          <input className="in mono" name="code" defaultValue={school.code} required />
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label className="field">
          City
          <input className="in" name="city" defaultValue={school.city ?? ""} />
        </label>
        <label className="field">
          State
          <input className="in" name="state" defaultValue={school.state ?? ""} />
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label className="field">
          Plan
          <select className="in" name="plan" defaultValue={school.plan}>
            {PLAN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Status
          <select className="in" name="status" defaultValue={school.status}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {state.error && (
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: "var(--critical)", background: "var(--critical-tint)", border: "1px solid var(--critical-border)", borderRadius: 8, padding: "7px 10px" }}>
          {state.error}
        </p>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={pending} style={{ background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12.5, fontWeight: 700, cursor: pending ? "default" : "pointer" }}>
          {pending ? "Saving…" : "Save changes"}
        </button>
        <span onClick={() => setEditing(false)} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 16px", fontSize: 12.5, fontWeight: 600, color: "var(--ink)", cursor: "pointer" }}>
          Cancel
        </span>
      </div>
    </form>
  );
}

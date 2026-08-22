"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createEvent, type FormState } from "../actions";

const initialState: FormState = {};

export default function NewEventForm() {
  const [state, formAction, pending] = useActionState(createEvent, initialState);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 460 }}>
      <label className="field">
        Title
        <input className="in" name="title" required placeholder="Sports Day" />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <label className="field">
          Type
          <input className="in" name="type" placeholder="Sports / Academic / Cultural" />
        </label>
        <label className="field">
          Date
          <input className="in" type="date" name="date" required />
        </label>
      </div>
      <label className="field">
        Venue
        <input className="in" name="venue" placeholder="Main Ground" />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <label className="field">
          Expected attendance
          <input className="in mono" type="number" name="expectedAttendance" placeholder="480" />
        </label>
        <label className="field">
          Estimated cost (₹)
          <input className="in mono" type="number" name="budgetEstimate" placeholder="45000" />
        </label>
      </div>
      {state.error && (
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--critical)", background: "var(--critical-tint)", border: "1px solid var(--critical-border)", borderRadius: 8, padding: "8px 11px" }}>
          {state.error}
        </p>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" disabled={pending} style={{ background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1 }}>
          {pending ? "Saving…" : "Create event"}
        </button>
        <Link href="/app/events" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: "9px 18px", fontSize: 13.5, fontWeight: 600, textDecoration: "none", color: "var(--ink)" }}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createRoom, type FormState } from "../actions";

const initialState: FormState = {};

export default function NewRoomForm() {
  const [state, formAction, pending] = useActionState(createRoom, initialState);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 380 }}>
      <label className="field">
        Room number
        <input className="in" name="roomNo" required placeholder="Room 204" />
      </label>
      <label className="field">
        Capacity (beds)
        <input className="in mono" type="number" name="capacity" required placeholder="4" />
      </label>
      {state.error && (
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--critical)", background: "var(--critical-tint)", border: "1px solid var(--critical-border)", borderRadius: 8, padding: "8px 11px" }}>
          {state.error}
        </p>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" disabled={pending} style={{ background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1 }}>
          {pending ? "Saving…" : "Add room"}
        </button>
        <Link href="/app/transport?tab=hostel" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: "9px 18px", fontSize: 13.5, fontWeight: 600, textDecoration: "none", color: "var(--ink)" }}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

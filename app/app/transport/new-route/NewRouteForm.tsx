"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createRoute, type FormState } from "../actions";

const initialState: FormState = {};

export default function NewRouteForm() {
  const [state, formAction, pending] = useActionState(createRoute, initialState);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 420 }}>
      <label className="field">
        Route name
        <input className="in" name="name" required placeholder="Route 7 · Sunrise Colony" />
      </label>
      <label className="field">
        Driver name
        <input className="in" name="driverName" placeholder="Ramesh Yadav" />
      </label>
      <label className="field">
        Vehicle number
        <input className="in mono" name="vehicleNo" placeholder="DL 1PC 4521" />
      </label>
      <label className="field">
        Capacity
        <input className="in mono" type="number" name="capacity" placeholder="45" />
      </label>
      {state.error && (
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--critical)", background: "var(--critical-tint)", border: "1px solid var(--critical-border)", borderRadius: 8, padding: "8px 11px" }}>
          {state.error}
        </p>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" disabled={pending} style={{ background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1 }}>
          {pending ? "Saving…" : "Add route"}
        </button>
        <Link href="/app/transport" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: "9px 18px", fontSize: 13.5, fontWeight: 600, textDecoration: "none", color: "var(--ink)" }}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

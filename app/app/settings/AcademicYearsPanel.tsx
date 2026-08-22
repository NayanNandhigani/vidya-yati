"use client";

import { useActionState, useState, useTransition } from "react";
import { createAcademicYear, setCurrentYear, type FormState } from "./actions";

type Year = { id: string; label: string; startDate: string; endDate: string; isCurrent: boolean };

const initialState: FormState = {};

export default function AcademicYearsPanel({ years }: { years: Year[] }) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction, pending] = useActionState(createAcademicYear, initialState);
  const [, startTransition] = useTransition();

  function makeCurrent(id: string) {
    startTransition(async () => {
      await setCurrentYear(id);
    });
  }

  return (
    <div style={{ maxWidth: 640, width: "100%" }}>
      <div style={{ marginBottom: 16 }}>
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 2 }}>
          Academic years
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Manage the academic sessions used for admissions, promotions and fee cycles.</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {years.map((y) => {
          const now = new Date();
          const status = y.isCurrent ? "active" : new Date(y.endDate) < now ? "closed" : "upcoming";
          const style = status === "active" ? { bg: "var(--good-tint)", fg: "var(--good)", label: "Active" } : status === "closed" ? { bg: "var(--line)", fg: "var(--faint)", label: "Closed" } : { bg: "var(--info-tint)", fg: "var(--info)", label: "Upcoming" };
          return (
            <div key={y.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{y.label}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>
                  {new Date(y.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} – {new Date(y.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span className="pill" style={{ background: style.bg, color: style.fg }}>
                  {style.label}
                </span>
                {!y.isCurrent && (
                  <span onClick={() => makeCurrent(y.id)} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--marigold-deep)", cursor: "pointer" }}>
                    Set as active
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showForm ? (
        <form action={formAction} style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12, border: "1px solid var(--line)", borderRadius: 10, padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <label className="field">
              Label
              <input className="in" name="label" placeholder="2027–28" required />
            </label>
            <label className="field">
              Start date
              <input className="in mono" type="date" name="startDate" required />
            </label>
            <label className="field">
              End date
              <input className="in mono" type="date" name="endDate" required />
            </label>
          </div>
          {state.error && <div style={{ color: "var(--critical)", fontSize: 12.5 }}>{state.error}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" disabled={pending} style={{ background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {pending ? "Adding…" : "Add year"}
            </button>
            <span onClick={() => setShowForm(false)} style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", cursor: "pointer", padding: "8px 4px" }}>
              Cancel
            </span>
          </div>
        </form>
      ) : (
        <span onClick={() => setShowForm(true)} style={{ display: "inline-block", marginTop: 16, fontSize: 13, fontWeight: 600, color: "var(--marigold-deep)", cursor: "pointer" }}>
          + Add academic year
        </span>
      )}
    </div>
  );
}

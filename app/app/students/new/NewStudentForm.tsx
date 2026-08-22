"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createStudent, type StudentFormState } from "../actions";

const initialState: StudentFormState = {};

export default function NewStudentForm({ classes }: { classes: { id: string; grade: string; section: string }[] }) {
  const [state, formAction, pending] = useActionState(createStudent, initialState);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 460 }}>
      <label className="field">
        Full name
        <input className="in" name="name" required placeholder="Aarav Mehta" />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <label className="field">
          Admission number
          <input className="in" name="admissionNo" required placeholder="AD-2050" />
        </label>
        <label className="field">
          Class
          <select className="in" name="classId" required defaultValue="">
            <option value="" disabled>
              Select class
            </option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.grade}-{c.section}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <label className="field">
          Date of birth
          <input className="in" type="date" name="dob" />
        </label>
        <label className="field">
          Gender
          <select className="in" name="gender" defaultValue="">
            <option value="">Not specified</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
      </div>

      {state.error && (
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--critical)", background: "var(--critical-tint)", border: "1px solid var(--critical-border)", borderRadius: 8, padding: "8px 11px" }}>
          {state.error}
        </p>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="submit"
          disabled={pending}
          style={{ background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1 }}
        >
          {pending ? "Saving…" : "Add student"}
        </button>
        <Link
          href="/app/students"
          style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: "9px 18px", fontSize: 13.5, fontWeight: 600, textDecoration: "none", color: "var(--ink)" }}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

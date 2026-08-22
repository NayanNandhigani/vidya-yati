"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createBook, type FormState } from "../actions";

const initialState: FormState = {};

export default function NewBookForm() {
  const [state, formAction, pending] = useActionState(createBook, initialState);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 440 }}>
      <label className="field">
        Title
        <input className="in" name="title" required placeholder="Wings of Fire" />
      </label>
      <label className="field">
        Author
        <input className="in" name="author" placeholder="A.P.J. Abdul Kalam" />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <label className="field">
          Accession no.
          <input className="in mono" name="accessionNo" required placeholder="ACC-01123" />
        </label>
        <label className="field">
          Category
          <input className="in" name="category" placeholder="Biography" />
        </label>
      </div>
      <label className="field">
        Number of copies
        <input className="in mono" type="number" name="copies" required min={1} placeholder="4" />
      </label>
      {state.error && (
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--critical)", background: "var(--critical-tint)", border: "1px solid var(--critical-border)", borderRadius: 8, padding: "8px 11px" }}>
          {state.error}
        </p>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" disabled={pending} style={{ background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1 }}>
          {pending ? "Saving…" : "Add title"}
        </button>
        <Link href="/app/library" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: "9px 18px", fontSize: 13.5, fontWeight: 600, textDecoration: "none", color: "var(--ink)" }}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

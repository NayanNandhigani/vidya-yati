"use client";

import { useActionState, useEffect, useState } from "react";
import { updateRelationshipManager, type ManageFormState } from "./actions";

const initialState: ManageFormState = {};

export default function RelationshipManagerField({ schoolId, relationshipManager }: { schoolId: string; relationshipManager: string | null }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateRelationshipManager, initialState);

  useEffect(() => {
    if (state.success) setEditing(false);
  }, [state.success]);

  if (!editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12.5, color: "var(--ink)" }}>{relationshipManager ?? "Not assigned"}</span>
        <span onClick={() => setEditing(true)} style={{ cursor: "pointer", color: "var(--marigold-deep)", fontSize: 12, fontWeight: 600 }}>
          {relationshipManager ? "Change" : "Assign"}
        </span>
      </div>
    );
  }

  return (
    <form action={formAction} style={{ display: "flex", gap: 8 }}>
      <input type="hidden" name="id" value={schoolId} />
      <input className="in" name="relationshipManager" defaultValue={relationshipManager ?? ""} placeholder="e.g. Radhika Menon" autoFocus style={{ flex: 1 }} />
      <button type="submit" disabled={pending} style={{ background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 8, padding: "0 14px", fontSize: 12.5, fontWeight: 700, cursor: pending ? "default" : "pointer" }}>
        {pending ? "…" : "Save"}
      </button>
      <span onClick={() => setEditing(false)} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: "0 12px", fontSize: 12.5, fontWeight: 600, color: "var(--ink)", cursor: "pointer", display: "flex", alignItems: "center" }}>
        ×
      </span>
    </form>
  );
}

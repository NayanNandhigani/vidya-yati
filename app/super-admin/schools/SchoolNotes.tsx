"use client";

import { useActionState, useEffect, useRef } from "react";
import { addSchoolNote, type ManageFormState } from "./actions";

const initialState: ManageFormState = {};

type Note = { id: string; body: string; createdAt: string; authorName: string };

export default function SchoolNotes({ schoolId, notes }: { schoolId: string; notes: Note[] }) {
  const [state, formAction, pending] = useActionState(addSchoolNote, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {notes.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>No notes yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" }}>
          {notes.map((note) => (
            <div key={note.id} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: "9px 12px" }}>
              <div style={{ fontSize: 13, color: "var(--ink)", whiteSpace: "pre-wrap" }}>{note.body}</div>
              <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 6 }}>
                {note.authorName} ·{" "}
                <span className="mono">
                  {new Date(note.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <form ref={formRef} action={formAction} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input type="hidden" name="id" value={schoolId} />
        <textarea
          name="body"
          className="in"
          required
          rows={2}
          placeholder="Add a note about this school…"
          style={{ resize: "vertical", fontFamily: "inherit" }}
        />
        {state.error && (
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--critical)" }}>{state.error}</p>
        )}
        <span>
          <button type="submit" disabled={pending} style={{ background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: pending ? "default" : "pointer" }}>
            {pending ? "Adding…" : "Add note"}
          </button>
        </span>
      </form>
    </div>
  );
}

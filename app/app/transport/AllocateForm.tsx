"use client";

import { useState, useTransition } from "react";
import { allocateRoom } from "./actions";

export default function AllocateForm({ roomId, students }: { roomId: string; students: { id: string; name: string }[] }) {
  const [studentId, setStudentId] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!studentId) return;
    setError(null);
    startTransition(async () => {
      try {
        await allocateRoom(roomId, studentId);
        setStudentId("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not allocate.");
      }
    });
  }

  return (
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>Allocate a student</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <select className="in" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">Select student…</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {error && <div style={{ color: "var(--critical)", fontSize: 12, marginTop: 6 }}>{error}</div>}
      <span onClick={submit} style={{ display: "block", background: "var(--marigold)", color: "#fff", borderRadius: 8, padding: 9, textAlign: "center", fontSize: 13, fontWeight: 700, marginTop: 10, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1 }}>
        {pending ? "Allocating…" : "Allocate"}
      </span>
    </div>
  );
}

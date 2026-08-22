"use client";

import { useState, useTransition } from "react";
import { addStop } from "./actions";

export default function AddStopForm({ routeId }: { routeId: string }) {
  const [name, setName] = useState("");
  const [time, setTime] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) return;
    startTransition(async () => {
      await addStop(routeId, name.trim(), time);
      setName("");
      setTime("");
    });
  }

  return (
    <div style={{ display: "flex", gap: 6 }}>
      <input className="in" placeholder="Stop name" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1, fontSize: 12 }} />
      <input className="in mono" type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ width: 100, fontSize: 12 }} />
      <button onClick={submit} disabled={pending} style={{ background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 6, padding: "0 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
        Add
      </button>
    </div>
  );
}

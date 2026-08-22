"use client";

import { useState, useTransition } from "react";
import { formatINR } from "@/lib/format";
import { addChecklistItem, toggleChecklistItem, sendEventReminder } from "./actions";

type ChecklistItem = { id: string; task: string; status: "PENDING" | "DONE" };
type EventData = {
  id: string;
  title: string;
  type: string | null;
  date: string;
  venue: string | null;
  expectedAttendance: number | null;
  budgetEstimate: number | null;
  checklistItems: ChecklistItem[];
};

export default function EventDetail({ event, canEdit }: { event: EventData; canEdit: boolean }) {
  const [items, setItems] = useState(event.checklistItems);
  const [newTask, setNewTask] = useState("");
  const [pending, startTransition] = useTransition();
  const [reminded, setReminded] = useState(false);

  const done = items.filter((i) => i.status === "DONE").length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  function toggle(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: i.status === "DONE" ? "PENDING" : "DONE" } : i)));
    startTransition(async () => {
      await toggleChecklistItem(id);
    });
  }

  function addItem() {
    if (!newTask.trim()) return;
    const task = newTask.trim();
    setNewTask("");
    startTransition(async () => {
      await addChecklistItem(event.id, task);
    });
  }

  function remind() {
    startTransition(async () => {
      await sendEventReminder(event.id);
      setReminded(true);
    });
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ background: "var(--teal-tint)", padding: "18px 20px 16px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div className="disp" style={{ fontSize: 17 }}>
            {event.title}
          </div>
          {event.type && (
            <span className="pill" style={{ background: "var(--teal)", color: "#fff" }}>
              {event.type}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16, flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 12.5 }}>
          <div>{new Date(event.date).toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</div>
          {event.venue && <div style={{ color: "var(--muted)" }}>{event.venue}</div>}
          {event.expectedAttendance !== null && (
            <div style={{ color: "var(--muted)" }}>
              <span className="mono" style={{ fontWeight: 700 }}>
                {event.expectedAttendance}
              </span>{" "}
              expected
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--line)" }} />

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Preparation checklist</span>
            <span className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>
              {done}/{items.length} done
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "var(--line)", overflow: "hidden", marginBottom: 6 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "var(--good)", borderRadius: 3 }} />
          </div>
          {items.map((i) => (
            <div key={i.id} onClick={() => canEdit && toggle(i.id)} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5, padding: "7px 0", borderBottom: "1px solid var(--line)", cursor: canEdit ? "pointer" : "default" }}>
              <span style={{ width: 15, height: 15, borderRadius: "50%", border: `1.5px solid ${i.status === "DONE" ? "var(--good)" : "var(--line)"}`, background: i.status === "DONE" ? "var(--good)" : "transparent", flex: "none" }} />
              <span style={{ color: i.status === "DONE" ? "var(--ink)" : "var(--muted)" }}>{i.task}</span>
            </div>
          ))}
          {canEdit && (
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <input className="in" placeholder="Add checklist item…" value={newTask} onChange={(e) => setNewTask(e.target.value)} style={{ flex: 1, fontSize: 12 }} />
              <button onClick={addItem} disabled={pending} style={{ background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 6, padding: "0 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Add
              </button>
            </div>
          )}
        </div>

        {event.budgetEstimate !== null && (
          <>
            <div style={{ borderTop: "1px solid var(--line)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Estimated cost</div>
                <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: "var(--marigold-deep)" }}>
                  {formatINR(event.budgetEstimate)}
                </div>
              </div>
            </div>
          </>
        )}

        {canEdit && (
          <button
            onClick={remind}
            disabled={pending}
            style={{ background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 8, padding: 9, fontSize: 12.5, fontWeight: 700, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1, marginTop: "auto" }}
          >
            {reminded ? "Reminder sent ✓" : "Send reminder to parents"}
          </button>
        )}
      </div>
    </div>
  );
}

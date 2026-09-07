"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { addReminder, removeReminder } from "./actions";

// ------------------------------------------------------------------ Reminders

type Reminder = { id: string; title: string; content: string; createdAt: string };

export function RemindersPanel({ reminders }: { reminders: Reminder[] }) {
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  function add() {
    if (!title.trim()) return;
    startTransition(async () => {
      await addReminder(title, content);
      setTitle("");
      setContent("");
      setAdding(false);
    });
  }

  return (
    <div className="card" style={{ width: 280, flex: "none", padding: 16, display: "flex", flexDirection: "column", gap: 10, maxHeight: 260 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700 }}>Reminders</div>
        <span onClick={() => setAdding((v) => !v)} style={{ fontSize: 11.5, fontWeight: 700, color: "var(--marigold-deep)", cursor: "pointer" }}>
          {adding ? "Cancel" : "+ Add"}
        </span>
      </div>

      {adding && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input className="in" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" style={{ fontSize: 12 }} />
          <textarea className="in" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Content" rows={2} style={{ fontSize: 12 }} />
          <button type="button" onClick={add} disabled={pending} style={{ fontSize: 11.5, fontWeight: 700, background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 6, padding: "5px 0", cursor: pending ? "default" : "pointer" }}>
            Save reminder
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
        {reminders.length === 0 && !adding && <div style={{ fontSize: 12, color: "var(--muted)" }}>No reminders yet.</div>}
        {reminders.map((r) => (
          <div key={r.id} style={{ background: "var(--paper)", borderRadius: 7, padding: "8px 10px", position: "relative" }}>
            <span onClick={() => startTransition(() => removeReminder(r.id))} style={{ position: "absolute", top: 5, right: 7, fontSize: 12, color: "var(--muted)", cursor: "pointer" }}>
              ×
            </span>
            <div style={{ fontSize: 12, fontWeight: 700, paddingRight: 14 }}>{r.title}</div>
            {r.content && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{r.content}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ Staff availability

type StaffStatus = { id: string; name: string; status: "PRESENT" | "ABSENT" | "HALF_DAY" | null };

export function StaffAvailabilityTile({ staff }: { staff: StaffStatus[] }) {
  const [open, setOpen] = useState(false);
  const present = staff.filter((s) => s.status === "PRESENT").length;
  const total = staff.length;

  return (
    <>
      <div className="card" onClick={() => setOpen(true)} style={{ padding: "15px 17px", cursor: "pointer" }}>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 7 }}>Staff available today</div>
        <div className="mono" style={{ fontSize: 23, fontWeight: 600, color: "var(--teal)" }}>
          {present}
          <span style={{ fontSize: 13, color: "var(--faint)", fontWeight: 500 }}> / {total}</span>
        </div>
      </div>

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: 420, maxHeight: "70vh", padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>Staff availability today</div>
              <span onClick={() => setOpen(false)} style={{ cursor: "pointer", fontSize: 16, color: "var(--muted)" }}>
                ×
              </span>
            </div>
            <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {staff.map((s) => {
                const style =
                  s.status === "PRESENT"
                    ? { bg: "var(--good-tint)", fg: "var(--good)", label: "Present" }
                    : s.status === "ABSENT"
                      ? { bg: "var(--critical-tint)", fg: "var(--critical)", label: "Absent" }
                      : s.status === "HALF_DAY"
                        ? { bg: "var(--warn-tint)", fg: "var(--warn)", label: "Half day" }
                        : { bg: "var(--line)", fg: "var(--muted)", label: "Not marked" };
                return (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "var(--paper)", borderRadius: 7, fontSize: 12.5 }}>
                    <span>{s.name}</span>
                    <span className="pill" style={{ background: style.bg, color: style.fg }}>
                      {style.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------- Pending approvals

type ApprovalItem = { label: string; count: number; href: string };

export function PendingApprovalsPanel({ items }: { items: ApprovalItem[] }) {
  const total = items.reduce((s, i) => s + i.count, 0);
  if (total === 0) return null;

  return (
    <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>Pending approvals</div>
        <span className="pill" style={{ background: "var(--warn-tint)", color: "var(--warn)" }}>
          {total} pending
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items
          .filter((i) => i.count > 0)
          .map((i) => (
            <Link key={i.label} href={i.href} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--ink)", textDecoration: "none", padding: "6px 2px" }}>
              <span>{i.label}</span>
              <span className="mono" style={{ fontWeight: 700, color: "var(--marigold-deep)" }}>
                {i.count} →
              </span>
            </Link>
          ))}
      </div>
    </div>
  );
}

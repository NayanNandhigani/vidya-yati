"use client";

import { useRouter } from "next/navigation";

type Props = {
  classes: { id: string; grade: string; section: string }[];
  classId: string;
  date: string;
};

export default function AttendanceFilters({ classes, classId, date }: Props) {
  const router = useRouter();

  function update(next: Partial<{ classId: string; date: string }>) {
    const params = new URLSearchParams({ classId: next.classId ?? classId, date: next.date ?? date });
    router.push(`/app/attendance?${params.toString()}`);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <select
        className="in"
        value={classId}
        onChange={(e) => update({ classId: e.target.value })}
        style={{ width: "auto", background: "var(--card)", fontWeight: 600 }}
      >
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            Class {c.grade}-{c.section}
          </option>
        ))}
      </select>
      <input
        className="in mono"
        type="date"
        value={date}
        onChange={(e) => update({ date: e.target.value })}
        style={{ width: "auto", background: "var(--card)", fontWeight: 600 }}
      />
    </div>
  );
}

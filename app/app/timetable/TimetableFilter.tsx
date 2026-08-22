"use client";

import { useRouter } from "next/navigation";

export default function TimetableFilter({
  classes,
  classId,
  classTeacherName,
}: {
  classes: { id: string; grade: string; section: string }[];
  classId: string;
  classTeacherName: string | null;
}) {
  const router = useRouter();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <select
        className="in mono"
        value={classId}
        onChange={(e) => router.push(`/app/timetable?classId=${e.target.value}`)}
        style={{ width: "auto", background: "var(--card)", fontWeight: 600 }}
      >
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            Class {c.grade}-{c.section}
          </option>
        ))}
      </select>
      {classTeacherName && (
        <span style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600 }}>
          Class teacher: {classTeacherName}
        </span>
      )}
    </div>
  );
}

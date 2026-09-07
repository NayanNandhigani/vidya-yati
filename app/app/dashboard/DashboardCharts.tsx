// Plain presentational bar charts for the School Admin dashboard — no
// client-side state needed, so these render directly from the server
// component (no "use client").

export function AttendanceByClassChart({ data }: { data: { label: string; pct: number }[] }) {
  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>Attendance by class — today</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>% present, per class</div>
      {data.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 12.5 }}>No attendance marked yet today.</div>
      ) : (
        <>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 6, borderBottom: "1px solid var(--line)", paddingBottom: 2, minHeight: 100 }}>
            {data.map((d) => (
              <div key={d.label} style={{ flex: 1, height: `${Math.max(3, d.pct)}%`, background: d.pct < 75 ? "var(--critical)" : "var(--teal-tint)", borderRadius: "3px 3px 0 0", position: "relative" }}>
                <span className="mono" style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", fontSize: 9.5, color: "var(--faint)" }}>
                  {d.pct}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6, fontSize: 9.5, color: "var(--faint)" }}>
            {data.map((d) => (
              <span key={d.label} style={{ flex: 1, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {d.label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function FeeTrendChart({ data }: { data: { label: string; collected: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.collected));
  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>Fee collection — last 6 months</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>Amount collected per month</div>
      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 10, borderBottom: "1px solid var(--line)", paddingBottom: 2, minHeight: 100 }}>
        {data.map((d) => (
          <div key={d.label} style={{ flex: 1, height: `${Math.max(3, (d.collected / max) * 100)}%`, background: "var(--marigold-tint)", borderRadius: "3px 3px 0 0" }} />
        ))}
      </div>
      <div style={{ display: "flex", marginTop: 8, fontSize: 10.5, color: "var(--faint)" }}>
        {data.map((d) => (
          <span key={d.label} style={{ flex: 1, textAlign: "center" }}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ResultsTrendChart({ data }: { data: { label: string; avgPct: number }[] }) {
  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>Exam results — this year</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>Average % per completed exam</div>
      {data.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 12.5 }}>No exam results yet this year.</div>
      ) : (
        <>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 10, borderBottom: "1px solid var(--line)", paddingBottom: 2, minHeight: 100 }}>
            {data.map((d) => (
              <div key={d.label} style={{ flex: 1, height: `${Math.max(3, d.avgPct)}%`, background: "var(--info-tint)", borderRadius: "3px 3px 0 0", position: "relative" }}>
                <span className="mono" style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", fontSize: 9.5, color: "var(--faint)" }}>
                  {d.avgPct}%
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6, fontSize: 9.5, color: "var(--faint)" }}>
            {data.map((d) => (
              <span key={d.label} style={{ flex: 1, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {d.label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

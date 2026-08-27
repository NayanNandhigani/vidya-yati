type Datum = { module: string; count: number };

// Single-series magnitude bar chart — one brand hue is correct here (no
// second dimension to encode), per the dataviz mark spec: thin bar, rounded
// at the data-end (tip), square at the baseline, value labeled at the tip.
export default function ModuleUsageChart({ data }: { data: Datum[] }) {
  if (data.length === 0) {
    return <div style={{ fontSize: 12.5, color: "var(--muted)" }}>No module activity recorded in the last 30 days.</div>;
  }

  const max = Math.max(...data.map((d) => d.count));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {data.map((d) => {
        const widthPct = max > 0 ? Math.max((d.count / max) * 100, 4) : 0;
        return (
          <div
            key={d.module}
            title={`${d.module}: ${d.count} view${d.count === 1 ? "" : "s"} in the last 30 days`}
            style={{ display: "grid", gridTemplateColumns: "88px 1fr 30px", alignItems: "center", gap: 8 }}
          >
            <div style={{ fontSize: 11.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.module}</div>
            <div style={{ height: 14, background: "transparent" }}>
              <div style={{ width: `${widthPct}%`, height: "100%", background: "var(--marigold)", borderRadius: "0 4px 4px 0" }} />
            </div>
            <div className="mono" style={{ fontSize: 11.5, color: "var(--ink)", textAlign: "right" }}>
              {d.count}
            </div>
          </div>
        );
      })}
    </div>
  );
}

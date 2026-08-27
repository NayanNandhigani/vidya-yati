const STAGES: { key: string; label: string }[] = [
  { key: "LEAD", label: "Lead" },
  { key: "DEMO_SCHEDULED", label: "Demo scheduled" },
  { key: "PROPOSAL_SENT", label: "Proposal sent" },
  { key: "NEGOTIATION", label: "Negotiation" },
  { key: "WON", label: "Won" },
];

// One ordered metric across funnel steps — a single hue (magnitude, not
// identity) is the right color job here, not a categorical palette.
export default function SalesPipelineFunnel({ counts }: { counts: Record<string, number> }) {
  const max = Math.max(1, ...STAGES.map((s) => counts[s.key] ?? 0));
  const total = STAGES.reduce((sum, s) => sum + (counts[s.key] ?? 0), 0);

  if (total === 0) {
    return <div style={{ fontSize: 12.5, color: "var(--muted)" }}>No schools in the pipeline yet.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {STAGES.map((s) => {
        const count = counts[s.key] ?? 0;
        const widthPct = Math.max((count / max) * 100, count > 0 ? 6 : 0);
        return (
          <div key={s.key} style={{ display: "grid", gridTemplateColumns: "120px 1fr 30px", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{s.label}</div>
            <div style={{ height: 18, background: "var(--paper)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${widthPct}%`, height: "100%", background: s.key === "WON" ? "var(--good)" : "var(--marigold)", borderRadius: 4 }} />
            </div>
            <div className="mono" style={{ fontSize: 12.5, fontWeight: 600, textAlign: "right" }}>
              {count}
            </div>
          </div>
        );
      })}
    </div>
  );
}

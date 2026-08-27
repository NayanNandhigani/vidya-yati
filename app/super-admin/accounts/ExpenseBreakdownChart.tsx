type Slice = { label: string; amount: number; color: string };

const SIZE = 160;
const RADIUS = 60;
const STROKE = 24;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// The brand only defines three categorical chart hues (marigold/teal/clay),
// so this stays capped at the top 3 expense categories + a neutral "Other"
// bucket for the rest — the series-count ladder's "4: direct labels
// mandatory" tier, not an 8-slice pie the palette can't actually support.
export default function ExpenseBreakdownChart({ slices, totalLabel, formatAmount }: { slices: Slice[]; totalLabel: string; formatAmount: (n: number) => string }) {
  const total = slices.reduce((s, x) => s + x.amount, 0);

  if (total <= 0) {
    return <div style={{ fontSize: 12.5, color: "var(--muted)" }}>No expenses recorded yet.</div>;
  }

  let cumulative = 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ flex: "none" }}>
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="var(--line)" strokeWidth={STROKE} />
        <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
          {slices.map((s) => {
            const pct = s.amount / total;
            const len = pct * CIRCUMFERENCE;
            const offset = cumulative;
            cumulative += len;
            return (
              <circle
                key={s.label}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke={s.color}
                strokeWidth={STROKE}
                strokeDasharray={`${len} ${CIRCUMFERENCE - len}`}
                strokeDashoffset={-offset}
              >
                <title>{`${s.label}: ${formatAmount(s.amount)} (${Math.round(pct * 100)}%)`}</title>
              </circle>
            );
          })}
        </g>
        <text x={CENTER} y={CENTER - 5} textAnchor="middle" className="mono" style={{ fontSize: 15, fontWeight: 700, fill: "var(--ink)" }}>
          {formatAmount(total)}
        </text>
        <text x={CENTER} y={CENTER + 12} textAnchor="middle" style={{ fontSize: 9.5, fill: "var(--muted)" }}>
          {totalLabel}
        </text>
      </svg>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 0 }}>
        {slices.map((s) => {
          const pct = Math.round((s.amount / total) * 100);
          return (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: s.color, flex: "none" }} />
              <span style={{ color: "var(--ink)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
              <span className="mono" style={{ color: "var(--muted)" }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

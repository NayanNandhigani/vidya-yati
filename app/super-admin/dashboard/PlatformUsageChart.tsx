type RoleUsage = { total: number; active: number };
type SchoolUsage = { schoolId: string; schoolName: string; admin: RoleUsage; staff: RoleUsage; parent: RoleUsage };

// Fixed hue + fixed left-to-right position per role, never cycled — the
// brand's categorical trio (marigold/teal/clay) has a couple of adjacent
// pairs in the CVD floor band per the dataviz palette check, so identity
// here also rides position (School Admin always left, Parent always
// right) and an always-visible % label, not hue alone.
const SERIES: { key: "admin" | "staff" | "parent"; label: string; color: string }[] = [
  { key: "admin", label: "School Admin", color: "var(--marigold)" },
  { key: "staff", label: "Staff", color: "var(--teal)" },
  { key: "parent", label: "Parent", color: "var(--clay)" },
];

const BAR_AREA_HEIGHT = 108;

export default function PlatformUsageChart({ data }: { data: SchoolUsage[] }) {
  if (data.length === 0) {
    return <div style={{ fontSize: 12.5, color: "var(--muted)" }}>No schools onboarded yet.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", gap: 16 }}>
        {SERIES.map((s) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--muted)" }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: s.color, display: "inline-block" }} />
            {s.label}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 24, height: "100%", paddingBottom: 4 }}>
          {data.map((school) => (
            <div key={school.schoolId} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "none", width: 84 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: BAR_AREA_HEIGHT, width: "100%", justifyContent: "center" }}>
                {SERIES.map((s) => {
                  const { total, active } = school[s.key];
                  const pct = total > 0 ? Math.round((active / total) * 100) : 0;
                  const barPx = total > 0 ? Math.max((pct / 100) * BAR_AREA_HEIGHT, 3) : 2;
                  return (
                    <div
                      key={s.key}
                      title={total > 0 ? `${s.label}: ${active} of ${total} logged in (${pct}%)` : `${s.label}: no accounts yet`}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: BAR_AREA_HEIGHT, width: 18 }}
                    >
                      <span className="mono" style={{ fontSize: 9.5, color: "var(--faint)", marginBottom: 3 }}>
                        {total > 0 ? `${pct}%` : "—"}
                      </span>
                      <div style={{ width: 16, height: barPx, background: total > 0 ? s.color : "var(--line)", borderRadius: "4px 4px 0 0" }} />
                    </div>
                  );
                })}
              </div>
              <div
                style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 6, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}
                title={school.schoolName}
              >
                {school.schoolName}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Block({ height, style }: { height: number | string; style?: React.CSSProperties }) {
  return <div className="skeleton-block" style={{ height, borderRadius: 10, ...style }} />;
}

export default function DashboardLoading() {
  return (
    <div style={{ padding: "28px 36px", display: "flex", flexDirection: "column", gap: 18, height: "100dvh", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Block height={40} style={{ width: 260 }} />
        <Block height={38} style={{ width: 160 }} />
      </div>
      <div className="dash-grid-5" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Block key={i} height={78} />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Block height={160} />
        <Block height={140} />
        <Block height={220} />
      </div>
    </div>
  );
}

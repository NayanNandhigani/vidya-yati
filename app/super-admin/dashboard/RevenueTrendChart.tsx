"use client";

import { useState } from "react";
import { formatINR } from "@/lib/format";

type Point = { label: string; amount: number };

const WIDTH = 640;
const HEIGHT = 160;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const PAD_TOP = 24;
const PAD_BOTTOM = 22;

export default function RevenueTrendChart({ data }: { data: Point[] }) {
  const formatAmount = formatINR;
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(1, ...data.map((d) => d.amount));
  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const stepX = data.length > 1 ? plotW / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: PAD_LEFT + stepX * i,
    y: PAD_TOP + plotH - (d.amount / max) * plotH,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1]?.x.toFixed(1)},${PAD_TOP + plotH} L${points[0]?.x.toFixed(1)},${PAD_TOP + plotH} Z`;

  const active = hover !== null ? points[hover] : points[points.length - 1];

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let best = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - relX);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHover(nearest);
  }

  if (data.every((d) => d.amount === 0)) {
    return <div style={{ fontSize: 12.5, color: "var(--muted)" }}>No revenue collected yet.</div>;
  }

  return (
    <div style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: "100%", height: HEIGHT, display: "block", cursor: "crosshair" }}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <line x1={PAD_LEFT} y1={PAD_TOP + plotH} x2={WIDTH - PAD_RIGHT} y2={PAD_TOP + plotH} stroke="var(--line)" strokeWidth={1} />
        {active && <line x1={active.x} y1={PAD_TOP} x2={active.x} y2={PAD_TOP + plotH} stroke="var(--line)" strokeWidth={1} />}

        <path d={areaPath} fill="var(--marigold)" fillOpacity={0.1} stroke="none" />
        <path d={linePath} fill="none" stroke="var(--marigold)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {active && <circle cx={active.x} cy={active.y} r={4} fill="var(--marigold)" stroke="var(--card)" strokeWidth={2} />}

        {points.map((p, i) => (
          <rect key={i} x={p.x - stepX / 2} y={PAD_TOP} width={stepX || plotW} height={plotH} fill="transparent" onPointerEnter={() => setHover(i)} />
        ))}

        {points.map((p, i) => (
          <text key={i} x={p.x} y={HEIGHT - 4} textAnchor="middle" style={{ fontSize: 9, fill: "var(--faint)" }}>
            {p.label}
          </text>
        ))}
      </svg>

      {active && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: `${Math.min(Math.max((active.x / WIDTH) * 100, 8), 88)}%`,
            transform: "translateX(-50%)",
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 11.5,
            fontWeight: 700,
            color: "var(--marigold-deep)",
            whiteSpace: "nowrap",
            boxShadow: "0 2px 6px rgba(0,0,0,.08)",
            pointerEvents: "none",
          }}
        >
          {formatAmount(active.amount)}
          <span style={{ color: "var(--muted)", fontWeight: 500, marginLeft: 5 }}>{active.label}</span>
        </div>
      )}
    </div>
  );
}

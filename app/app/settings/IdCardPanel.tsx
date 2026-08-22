"use client";

import { useState, useTransition } from "react";
import { selectIdCardTemplate } from "./actions";
import { ID_CARD_LAYOUTS } from "./id-card-layouts";

export default function IdCardPanel({ selectedKey }: { selectedKey: string | null }) {
  const [selected, setSelected] = useState(selectedKey ?? ID_CARD_LAYOUTS[0].key);
  const [, startTransition] = useTransition();

  function select(key: string) {
    setSelected(key);
    startTransition(async () => {
      await selectIdCardTemplate(key);
    });
  }

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 2 }}>
          ID card templates
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Choose the design printed on student and staff ID cards.</div>
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {ID_CARD_LAYOUTS.map((tpl) => {
          const isSelected = selected === tpl.key;
          return (
            <div key={tpl.key} onClick={() => select(tpl.key)} style={{ cursor: "pointer", width: 168 }}>
              <div style={{ width: 168, height: 104, borderRadius: 12, background: tpl.gradient, position: "relative", padding: 14, boxShadow: isSelected ? "0 0 0 2px var(--marigold)" : "none" }}>
                <div style={{ position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,.25)", color: "#fff", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>{isSelected ? "✓" : ""}</div>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.3)", marginBottom: 8 }} />
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 12 }}>Aarav Mehta</div>
                <div className="mono" style={{ color: "rgba(255,255,255,.8)", fontSize: 10 }}>STU-2026-0417</div>
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{tpl.label}</div>
              </div>
              <span style={{ display: "inline-block", marginTop: 4, fontSize: 11.5, fontWeight: 600, color: isSelected ? "var(--good)" : "var(--marigold-deep)" }}>{isSelected ? "Selected" : "Select"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

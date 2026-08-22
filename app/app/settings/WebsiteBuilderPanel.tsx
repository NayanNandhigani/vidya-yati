"use client";

import { useActionState, useState } from "react";
import { saveWebsiteSettings, type FormState } from "./actions";

type Settings = { tagline: string | null; themeColor: string | null; sectionVisibility: Record<string, boolean> };

const SECTIONS = [
  { key: "hero", label: "Hero" },
  { key: "about", label: "About" },
  { key: "admissionsCta", label: "Admissions CTA" },
  { key: "faculty", label: "Faculty" },
  { key: "gallery", label: "Gallery" },
  { key: "contact", label: "Contact" },
];

const initialState: FormState = {};

export default function WebsiteBuilderPanel({ schoolName, settings }: { schoolName: string; settings: Settings }) {
  const [tagline, setTagline] = useState(settings.tagline ?? "");
  const [themeColor, setThemeColor] = useState(settings.themeColor ?? "var(--marigold)");
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => {
    const v: Record<string, boolean> = {};
    for (const s of SECTIONS) v[s.key] = settings.sectionVisibility[s.key] ?? true;
    return v;
  });
  const [state, formAction, pending] = useActionState(saveWebsiteSettings, initialState);

  return (
    <div style={{ flex: 1, display: "flex", gap: 20, minHeight: 0 }}>
      <form action={formAction} className="card" style={{ width: 322, flex: "none", padding: 22, display: "flex", flexDirection: "column", gap: 18, overflowY: "auto" }}>
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--faint)" }}>
          Site content
        </div>
        <label className="field">
          Tagline
          <input className="in" name="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Nurturing minds since 1998" />
        </label>

        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 9 }}>Color theme</div>
          <input type="hidden" name="themeColor" value={themeColor} />
          <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
            {["var(--marigold)", "var(--teal)", "var(--clay)", "var(--ink2)"].map((c) => (
              <div
                key={c}
                onClick={() => setThemeColor(c)}
                style={{ width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer", boxShadow: themeColor === c ? `0 0 0 2px var(--card), 0 0 0 4px ${c}` : "none" }}
              />
            ))}
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16, flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>Section visibility</div>
          {SECTIONS.map((s) => (
            <div key={s.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
              <span>{s.label}</span>
              <input type="hidden" name={`section_${s.key}`} value={visibility[s.key] ? "on" : ""} />
              <div
                onClick={() => setVisibility((v) => ({ ...v, [s.key]: !v[s.key] }))}
                style={{ width: 34, height: 18, borderRadius: 100, background: visibility[s.key] ? "var(--marigold)" : "var(--line)", position: "relative", cursor: "pointer" }}
              >
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: visibility[s.key] ? 18 : 2, transition: "left .15s ease" }} />
              </div>
            </div>
          ))}
        </div>

        <button type="submit" disabled={pending} style={{ background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {pending ? "Publishing…" : state.success ? "Published ✓" : "Publish changes"}
        </button>
      </form>

      <div className="card" style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flex: "none" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Live preview</span>
        </div>
        <div style={{ flex: 1, borderRadius: 12, overflow: "hidden", border: "1px solid var(--line)", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ background: "var(--sidebar)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 6, flex: "none" }}>
            <span className="mono" style={{ fontSize: 10.5, color: "#AEB8D6" }}>
              {schoolName.toLowerCase().replace(/\s+/g, "")}.vidyayati.in
            </span>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#fff", overflowY: "auto", minHeight: 0 }}>
            {visibility.hero && (
              <div style={{ textAlign: "center", padding: "28px 24px 22px", background: `linear-gradient(135deg, ${themeColor}22, var(--teal-tint))`, flex: "none" }}>
                <div className="disp" style={{ fontSize: 21, marginBottom: 6 }}>
                  {schoolName}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{tagline}</div>
              </div>
            )}
            {visibility.admissionsCta && (
              <div style={{ textAlign: "center", padding: "14px 24px", borderBottom: "1px solid var(--line)", flex: "none" }}>
                <span style={{ background: themeColor, color: "#fff", borderRadius: 7, padding: "8px 18px", fontSize: 11, fontWeight: 700, display: "inline-block" }}>Apply for Admission</span>
              </div>
            )}
            {visibility.about && (
              <div style={{ padding: "16px 22px", flex: "none" }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--faint)", textTransform: "uppercase", marginBottom: 6 }}>About us</div>
                <div style={{ fontSize: 10.5, lineHeight: 1.65, color: "var(--muted)" }}>{schoolName} is committed to curiosity-led learning, dedicated teachers, and a safe, welcoming campus.</div>
              </div>
            )}
            {visibility.gallery && (
              <div style={{ padding: "0 22px 16px", flex: "none" }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--faint)", textTransform: "uppercase", marginBottom: 9 }}>Gallery</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} style={{ flex: 1, height: 34, borderRadius: 6, background: "var(--marigold-tint)" }} />
                  ))}
                </div>
              </div>
            )}
            {visibility.contact && (
              <div style={{ background: "var(--ink2)", color: "#fff", padding: "12px 22px", display: "flex", justifyContent: "space-between", fontSize: 9, flex: "none", marginTop: "auto" }}>
                <span>📍 Contact</span>
                <span>📞 Phone</span>
                <span>✉️ Email</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

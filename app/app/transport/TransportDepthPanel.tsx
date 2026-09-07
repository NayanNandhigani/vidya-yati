"use client";

import { useState, useTransition } from "react";
import { updateRouteLocation, updateRouteCompliance } from "./depth-actions";

type Route = {
  id: string;
  driverLicenseNo: string | null;
  licenseExpiry: string | null;
  insuranceExpiry: string | null;
  fitnessExpiry: string | null;
  feeAmount: number | null;
  lastKnownLat: number | null;
  lastKnownLng: number | null;
  lastLocationAt: string | null;
};

function expiryStyle(dateStr: string | null): { color: string; label: string } | null {
  if (!dateStr) return null;
  const days = (new Date(dateStr).getTime() - Date.now()) / 86400000;
  if (days < 0) return { color: "var(--critical)", label: "Expired" };
  if (days <= 30) return { color: "var(--warn)", label: `${Math.ceil(days)}d left` };
  return { color: "var(--good)", label: "Valid" };
}

export default function TransportDepthPanel({ route, showLiveLocation, showCompliance }: { route: Route; showLiveLocation: boolean; showCompliance: boolean }) {
  const [, startTransition] = useTransition();
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [licenseNo, setLicenseNo] = useState(route.driverLicenseNo ?? "");
  const [licenseExp, setLicenseExp] = useState(route.licenseExpiry?.slice(0, 10) ?? "");
  const [insuranceExp, setInsuranceExp] = useState(route.insuranceExpiry?.slice(0, 10) ?? "");
  const [fitnessExp, setFitnessExp] = useState(route.fitnessExpiry?.slice(0, 10) ?? "");
  const [feeAmount, setFeeAmount] = useState(route.feeAmount?.toString() ?? "");

  function postLocation() {
    if (!lat || !lng) return;
    startTransition(() => updateRouteLocation(route.id, Number(lat), Number(lng)));
  }
  function saveCompliance() {
    startTransition(() => updateRouteCompliance(route.id, licenseNo, licenseExp, insuranceExp, fitnessExp, feeAmount ? Number(feeAmount) : null));
  }

  if (!showLiveLocation && !showCompliance) return null;

  return (
    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, marginTop: 4, display: "flex", flexDirection: "column", gap: 16 }}>
      {showLiveLocation && (
        <div>
          <div style={{ fontSize: 11.5, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Live location (manual ping)</div>
          {route.lastKnownLat != null ? (
            <div style={{ fontSize: 12.5, marginBottom: 8 }}>
              <a href={`https://www.google.com/maps?q=${route.lastKnownLat},${route.lastKnownLng}`} target="_blank" rel="noreferrer" style={{ color: "var(--marigold-deep)", fontWeight: 700 }}>
                Open last known position ↗
              </a>
              <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 2 }}>
                Updated {route.lastLocationAt ? new Date(route.lastLocationAt).toLocaleString("en-IN") : "—"}
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 12.5, marginBottom: 8 }}>No location posted yet.</div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <input className="in mono" placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} style={{ fontSize: 11.5, width: 100 }} />
            <input className="in mono" placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} style={{ fontSize: 11.5, width: 100 }} />
            <button type="button" onClick={postLocation} style={{ fontSize: 11.5, fontWeight: 700, background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 6, padding: "0 12px", cursor: "pointer" }}>
              Post location
            </button>
          </div>
        </div>
      )}

      {showCompliance && (
        <div>
          <div style={{ fontSize: 11.5, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Compliance & fee</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 }}>
            <input className="in" placeholder="Driver license no." value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} onBlur={saveCompliance} style={{ fontSize: 12 }} />
            {(
              [
                ["License expiry", licenseExp, setLicenseExp],
                ["Insurance expiry", insuranceExp, setInsuranceExp],
                ["Fitness cert. expiry", fitnessExp, setFitnessExp],
              ] as const
            ).map(([label, value, setter]) => {
              const style = expiryStyle(value || null);
              return (
                <label key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5, color: "var(--muted)" }}>
                  {label}
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input className="in mono" type="date" value={value} onChange={(e) => setter(e.target.value)} onBlur={saveCompliance} style={{ fontSize: 11.5 }} />
                    {style && <span style={{ color: style.color, fontWeight: 700, fontSize: 10.5 }}>{style.label}</span>}
                  </span>
                </label>
              );
            })}
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5, color: "var(--muted)" }}>
              Transport fee (₹/term)
              <input className="in mono" type="number" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} onBlur={saveCompliance} style={{ width: 90, fontSize: 11.5 }} />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

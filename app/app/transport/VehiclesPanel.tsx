"use client";

import { useState, useTransition } from "react";
import type { VehicleLogType } from "@prisma/client";
import { createVehicle, updateVehicle, toggleVehicleActive, updateVehicleLocation, addVehicleLog, deleteVehicleLog, addVehicleDocument, deleteVehicleDocument, type VehicleFields } from "./vehicle-actions";
import PersonDocumentsPanel, { type PersonDocumentRow } from "@/components/PersonDocumentsPanel";

export type VehicleRow = VehicleFields & {
  id: string;
  isActive: boolean;
  lastKnownLat: number | null;
  lastKnownLng: number | null;
  lastLocationAt: string | null;
  routeNames: string[];
};

type LogRow = { id: string; type: VehicleLogType; date: string; description: string; cost: number | null; odometerReading: number | null };

const EMPTY: VehicleFields = {
  vehicleNo: "",
  vehicleType: "",
  capacity: null,
  make: "",
  model: "",
  driverName: "",
  driverPhone: "",
  driverLicenseNo: "",
  driverLicenseExpiry: "",
  insurancePolicyNo: "",
  insuranceExpiry: "",
  fitnessExpiry: "",
  pollutionCertExpiry: "",
  notes: "",
} as unknown as VehicleFields;

function expiryStyle(dateStr: string | null): { color: string; label: string } | null {
  if (!dateStr) return null;
  const days = (new Date(dateStr).getTime() - Date.now()) / 86400000;
  if (days < 0) return { color: "var(--critical)", label: "Expired" };
  if (days <= 30) return { color: "var(--warn)", label: `${Math.ceil(days)}d left` };
  return { color: "var(--good)", label: "Valid" };
}

function Field({ children }: { children: React.ReactNode }) {
  return <label className="field">{children}</label>;
}

function toFormFields(f: Partial<VehicleFields>): VehicleFields {
  return {
    vehicleNo: f.vehicleNo ?? "",
    vehicleType: f.vehicleType ?? "",
    capacity: f.capacity ?? null,
    make: f.make ?? "",
    model: f.model ?? "",
    driverName: f.driverName ?? "",
    driverPhone: f.driverPhone ?? "",
    driverLicenseNo: f.driverLicenseNo ?? "",
    driverLicenseExpiry: f.driverLicenseExpiry?.slice(0, 10) ?? "",
    insurancePolicyNo: f.insurancePolicyNo ?? "",
    insuranceExpiry: f.insuranceExpiry?.slice(0, 10) ?? "",
    fitnessExpiry: f.fitnessExpiry?.slice(0, 10) ?? "",
    pollutionCertExpiry: f.pollutionCertExpiry?.slice(0, 10) ?? "",
    notes: f.notes ?? "",
  } as VehicleFields;
}

export function VehicleForm({ vehicle, onSaved }: { vehicle: VehicleRow | null; onSaved?: () => void }) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<VehicleFields>(vehicle ? toFormFields(vehicle) : EMPTY);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof VehicleFields>(key: K, value: VehicleFields[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    if (!form.vehicleNo.trim()) {
      setError("Vehicle number is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        if (vehicle) {
          await updateVehicle(vehicle.id, form);
        } else {
          await createVehicle(form);
          setForm(EMPTY);
        }
        onSaved?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 11, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Vehicle</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field>
          Vehicle no. (registration)
          <input className="in mono" value={form.vehicleNo} onChange={(e) => set("vehicleNo", e.target.value as never)} placeholder="TS 11 EF 1029" />
        </Field>
        <Field>
          Type
          <input className="in" value={form.vehicleType ?? ""} onChange={(e) => set("vehicleType", e.target.value as never)} placeholder="Bus / Van / Mini Bus" />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <Field>
          Capacity (seats)
          <input className="in mono" type="number" min={0} value={form.capacity ?? ""} onChange={(e) => set("capacity", (e.target.value ? Number(e.target.value) : null) as never)} placeholder="45" />
        </Field>
        <Field>
          Make
          <input className="in" value={form.make ?? ""} onChange={(e) => set("make", e.target.value as never)} placeholder="Tata" />
        </Field>
        <Field>
          Model
          <input className="in" value={form.model ?? ""} onChange={(e) => set("model", e.target.value as never)} placeholder="Starbus" />
        </Field>
      </div>

      <div style={{ fontSize: 11, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>Driver</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <Field>
          Driver name
          <input className="in" value={form.driverName ?? ""} onChange={(e) => set("driverName", e.target.value as never)} placeholder="Ramesh Yadav" />
        </Field>
        <Field>
          Driver phone
          <input className="in mono" value={form.driverPhone ?? ""} onChange={(e) => set("driverPhone", e.target.value as never)} placeholder="98765xxxxx" />
        </Field>
        <Field>
          License no.
          <input className="in mono" value={form.driverLicenseNo ?? ""} onChange={(e) => set("driverLicenseNo", e.target.value as never)} />
        </Field>
      </div>
      <Field>
        License expiry
        <input className="in mono" type="date" value={form.driverLicenseExpiry ?? ""} onChange={(e) => set("driverLicenseExpiry", e.target.value as never)} style={{ maxWidth: 180 }} />
      </Field>

      <div style={{ fontSize: 11, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>Compliance</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field>
          Insurance policy no.
          <input className="in mono" value={form.insurancePolicyNo ?? ""} onChange={(e) => set("insurancePolicyNo", e.target.value as never)} />
        </Field>
        <Field>
          Insurance expiry
          <input className="in mono" type="date" value={form.insuranceExpiry ?? ""} onChange={(e) => set("insuranceExpiry", e.target.value as never)} />
        </Field>
        <Field>
          Fitness cert. expiry
          <input className="in mono" type="date" value={form.fitnessExpiry ?? ""} onChange={(e) => set("fitnessExpiry", e.target.value as never)} />
        </Field>
        <Field>
          Pollution cert. expiry
          <input className="in mono" type="date" value={form.pollutionCertExpiry ?? ""} onChange={(e) => set("pollutionCertExpiry", e.target.value as never)} />
        </Field>
      </div>
      {vehicle && (
        <Field>
          Notes
          <textarea className="in" rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value as never)} />
        </Field>
      )}

      {error && <div style={{ color: "var(--critical)", fontSize: 12 }}>{error}</div>}
      <button type="button" onClick={submit} disabled={pending} style={{ background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 700, cursor: pending ? "default" : "pointer" }}>
        {pending ? "Saving…" : vehicle ? "Save changes" : "Add vehicle"}
      </button>
    </div>
  );
}

const LOG_TYPE_LABEL: Record<VehicleLogType, string> = { SERVICE: "Service", INSURANCE_RENEWAL: "Insurance renewal", OTHER: "Other" };

export function VehicleDetail({ vehicle, logs, documents }: { vehicle: VehicleRow; logs: LogRow[]; documents: PersonDocumentRow[] }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [logType, setLogType] = useState<VehicleLogType>("SERVICE");
  const [logDate, setLogDate] = useState("");
  const [logDesc, setLogDesc] = useState("");
  const [logCost, setLogCost] = useState("");
  const [logOdo, setLogOdo] = useState("");

  const insuranceStyle = expiryStyle(vehicle.insuranceExpiry);
  const fitnessStyle = expiryStyle(vehicle.fitnessExpiry);
  const pollutionStyle = expiryStyle(vehicle.pollutionCertExpiry);
  const licenseStyle = expiryStyle(vehicle.driverLicenseExpiry);

  function postLocation() {
    if (!lat || !lng) return;
    startTransition(() => updateVehicleLocation(vehicle.id, Number(lat), Number(lng)));
  }

  function submitLog() {
    if (!logDate || !logDesc.trim()) return;
    startTransition(async () => {
      await addVehicleLog(vehicle.id, logType, logDate, logDesc, logCost ? Number(logCost) : null, logOdo ? Number(logOdo) : null);
      setLogDate("");
      setLogDesc("");
      setLogCost("");
      setLogOdo("");
    });
  }

  if (editing) {
    return (
      <div>
        <VehicleForm vehicle={vehicle} onSaved={() => setEditing(false)} />
        <span onClick={() => setEditing(false)} style={{ display: "inline-block", marginTop: 10, fontSize: 12.5, fontWeight: 600, color: "var(--muted)", cursor: "pointer" }}>
          Cancel
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }} className="mono">{vehicle.vehicleNo}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            {[vehicle.vehicleType, vehicle.make, vehicle.model].filter(Boolean).join(" · ") || "—"} {vehicle.capacity ? `· ${vehicle.capacity} seats` : ""}
          </div>
          {vehicle.routeNames.length > 0 && <div style={{ fontSize: 11.5, color: "var(--teal)", marginTop: 4 }}>Serving: {vehicle.routeNames.join(", ")}</div>}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span
            onClick={() => startTransition(() => toggleVehicleActive(vehicle.id))}
            className="pill"
            style={{ background: vehicle.isActive ? "var(--good-tint)" : "var(--critical-tint)", color: vehicle.isActive ? "var(--good)" : "var(--critical)", cursor: pending ? "default" : "pointer" }}
          >
            {vehicle.isActive ? "Active" : "Inactive"}
          </span>
          <span onClick={() => setEditing(true)} style={{ fontSize: 12.5, fontWeight: 700, color: "var(--marigold-deep)", cursor: "pointer" }}>
            Edit
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        <MiniStat label="Driver" value={vehicle.driverName ?? "—"} sub={vehicle.driverPhone} />
        <MiniStat label="License" value={licenseStyle?.label ?? "—"} color={licenseStyle?.color} />
        <MiniStat label="Insurance" value={insuranceStyle?.label ?? "—"} color={insuranceStyle?.color} />
        <MiniStat label="Fitness" value={fitnessStyle?.label ?? "—"} color={fitnessStyle?.color} />
      </div>
      {pollutionStyle && (
        <div style={{ fontSize: 11.5, color: pollutionStyle.color }}>Pollution certificate: {pollutionStyle.label}</div>
      )}

      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
        <div style={{ fontSize: 11.5, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Live location (manual ping)</div>
        {vehicle.lastKnownLat != null ? (
          <div style={{ fontSize: 12.5, marginBottom: 8 }}>
            <a href={`https://www.google.com/maps?q=${vehicle.lastKnownLat},${vehicle.lastKnownLng}`} target="_blank" rel="noreferrer" style={{ color: "var(--marigold-deep)", fontWeight: 700 }}>
              Open last known position ↗
            </a>
            <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 2 }}>Updated {vehicle.lastLocationAt ? new Date(vehicle.lastLocationAt).toLocaleString("en-IN") : "—"}</div>
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

      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
        <div style={{ fontSize: 11.5, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Service &amp; insurance log</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          <select className="in" value={logType} onChange={(e) => setLogType(e.target.value as VehicleLogType)} style={{ fontSize: 11.5, width: "auto" }}>
            {(Object.keys(LOG_TYPE_LABEL) as VehicleLogType[]).map((t) => (
              <option key={t} value={t}>
                {LOG_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
          <input className="in mono" type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} style={{ fontSize: 11.5, width: 130 }} />
          <input className="in" placeholder="Description" value={logDesc} onChange={(e) => setLogDesc(e.target.value)} style={{ fontSize: 11.5, flex: 1, minWidth: 120 }} />
          <input className="in mono" type="number" placeholder="Cost ₹" value={logCost} onChange={(e) => setLogCost(e.target.value)} style={{ fontSize: 11.5, width: 80 }} />
          <input className="in mono" type="number" placeholder="Odometer" value={logOdo} onChange={(e) => setLogOdo(e.target.value)} style={{ fontSize: 11.5, width: 90 }} />
          <button type="button" onClick={submitLog} disabled={pending} style={{ fontSize: 11.5, fontWeight: 700, background: "var(--marigold)", color: "#fff", border: "none", borderRadius: 6, padding: "0 12px", cursor: "pointer" }}>
            Log
          </button>
        </div>
        {logs.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 12.5 }}>No log entries yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
            {logs.map((l) => (
              <div key={l.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 10, alignItems: "center", fontSize: 12, padding: "6px 10px", background: "var(--paper)", borderRadius: 6 }}>
                <span className="pill" style={{ background: "var(--card)", border: "1px solid var(--line)", fontSize: 10 }}>{LOG_TYPE_LABEL[l.type]}</span>
                <span>
                  {l.description}
                  {l.odometerReading != null && <span className="mono" style={{ color: "var(--faint)" }}> · {l.odometerReading} km</span>}
                </span>
                <span className="mono" style={{ color: "var(--muted)" }}>{l.cost != null ? `₹${l.cost.toLocaleString("en-IN")}` : ""}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>{new Date(l.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                  <span onClick={() => startTransition(() => deleteVehicleLog(l.id))} style={{ color: "var(--critical)", cursor: "pointer", fontWeight: 700 }}>×</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
        <div style={{ fontSize: 11.5, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Policy documents</div>
        <PersonDocumentsPanel
          documents={documents}
          redirectPath="/app/transport"
          onUpload={(category, formData) => addVehicleDocument(vehicle.id, category, formData)}
          onDelete={deleteVehicleDocument}
          assetUrlBase="/api/vehicle-documents"
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value, sub, color }: { label: string; value: string; sub?: string | null; color?: string }) {
  return (
    <div style={{ background: "var(--paper)", borderRadius: 8, padding: "9px 11px" }}>
      <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: color ?? "var(--ink)" }}>{value}</div>
      {sub && <div className="mono" style={{ fontSize: 10, color: "var(--faint)" }}>{sub}</div>}
    </div>
  );
}

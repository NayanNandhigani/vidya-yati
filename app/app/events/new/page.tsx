import { requireModuleAccess } from "@/lib/permissions";
import NewEventForm from "./NewEventForm";

export default async function NewEventPage() {
  await requireModuleAccess("Events", "EDIT");
  return (
    <div style={{ padding: "26px 34px" }}>
      <div className="disp" style={{ fontSize: 21, marginBottom: 4 }}>
        New Event
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 0, marginBottom: 22 }}>Schedule a new school event.</p>
      <div className="card" style={{ padding: 24, maxWidth: 500 }}>
        <NewEventForm />
      </div>
    </div>
  );
}

import { requireModuleAccess } from "@/lib/permissions";
import NewRoomForm from "./NewRoomForm";

export default async function NewRoomPage() {
  await requireModuleAccess("Transport", "EDIT");
  return (
    <div style={{ padding: "26px 34px" }}>
      <div className="disp" style={{ fontSize: 21, marginBottom: 4 }}>
        Add Hostel Room
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 0, marginBottom: 22 }}>Set up a new hostel room.</p>
      <div className="card" style={{ padding: 24, maxWidth: 420 }}>
        <NewRoomForm />
      </div>
    </div>
  );
}

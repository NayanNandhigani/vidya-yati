import Link from "next/link";
import { auth } from "@/auth";
import { getScopedDb } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";
import AddStopForm from "./AddStopForm";
import AllocateForm from "./AllocateForm";

export default async function TransportPage({ searchParams }: { searchParams: Promise<{ tab?: string; route?: string; room?: string }> }) {
  const session = await auth();
  const sdb = await getScopedDb();

  if (session!.user.role === "PARENT") {
    return <ParentTransportView />;
  }

  const accessLevel = await requireModuleAccess("Transport", "VIEW");
  const canEdit = accessLevel === "EDIT" || accessLevel === "FULL";
  const params = await searchParams;
  const tab = params.tab === "hostel" ? "hostel" : "transport";

  return (
    <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 16, height: "100dvh", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="disp" style={{ fontSize: 21 }}>
          Transport &amp; Hostel
        </div>
        {canEdit && (
          <Link href={tab === "hostel" ? "/app/transport/new-room" : "/app/transport/new-route"} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 15px", fontSize: 13, fontWeight: 600, textDecoration: "none", color: "var(--ink)" }}>
            + Add {tab === "hostel" ? "room" : "route"}
          </Link>
        )}
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid var(--line)" }}>
        <Link href="/app/transport?tab=transport" style={{ padding: "10px 2px", marginRight: 26, fontSize: 13.5, fontWeight: tab === "transport" ? 700 : 600, color: tab === "transport" ? "var(--ink)" : "var(--muted)", borderBottom: tab === "transport" ? "2px solid var(--marigold)" : "2px solid transparent", textDecoration: "none" }}>
          Transport
        </Link>
        <Link href="/app/transport?tab=hostel" style={{ padding: "10px 2px", fontSize: 13.5, fontWeight: tab === "hostel" ? 700 : 600, color: tab === "hostel" ? "var(--ink)" : "var(--muted)", borderBottom: tab === "hostel" ? "2px solid var(--marigold)" : "2px solid transparent", textDecoration: "none" }}>
          Hostel
        </Link>
      </div>

      {tab === "transport" ? <TransportTab selectedRouteId={params.route} canEdit={canEdit} sdb={sdb} /> : <HostelTab selectedRoomId={params.room} canEdit={canEdit} sdb={sdb} />}
    </div>
  );
}

async function TransportTab({ selectedRouteId, canEdit, sdb }: { selectedRouteId?: string; canEdit: boolean; sdb: Awaited<ReturnType<typeof getScopedDb>> }) {
  const routes = await sdb.transportRoute.findMany({ include: { assignments: true, stops: { orderBy: { sequence: "asc" } } }, orderBy: { name: "asc" } });
  const totalCommuting = routes.reduce((s, r) => s + r.assignments.length, 0);
  const busesInService = routes.filter((r) => r.assignments.length > 0).length;
  const avgUtilisation = routes.length ? Math.round((routes.reduce((s, r) => s + (r.capacity ? r.assignments.length / r.capacity : 0), 0) / routes.length) * 100) : 0;

  const selected = routes.find((r) => r.id === selectedRouteId) ?? routes[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, minHeight: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 13 }}>
        <Stat label="Active routes" value={routes.length} />
        <Stat label="Students commuting" value={totalCommuting} />
        <Stat label="Buses in service" value={<>{busesInService}<span style={{ fontSize: 13, color: "var(--faint)", fontWeight: 500 }}> / {routes.length}</span></>} color="var(--teal)" />
        <Stat label="Avg. seat utilisation" value={`${avgUtilisation}%`} color="var(--marigold-deep)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16, flex: 1, minHeight: 0 }}>
        <div className="card" style={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.3fr 1.1fr 0.7fr 0.9fr 0.9fr", padding: "13px 20px", borderBottom: "1px solid var(--line)", fontSize: 10.5, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <div>Route</div>
            <div>Driver</div>
            <div>Vehicle no.</div>
            <div>Capacity</div>
            <div>Assigned</div>
            <div>Status</div>
          </div>
          <div style={{ overflowY: "auto" }}>
            {routes.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>No routes set up yet.</div>}
            {routes.map((r) => {
              const isSelected = r.id === selected?.id;
              const full = r.capacity !== null && r.assignments.length >= r.capacity;
              const under = r.capacity !== null && r.assignments.length < r.capacity * 0.4;
              const status = r.assignments.length === 0 ? { label: "Inactive", bg: "var(--line)", fg: "var(--faint)" } : full ? { label: "Full", bg: "#fff", fg: "var(--teal)" } : under ? { label: "Under-subscribed", bg: "var(--warn-tint)", fg: "var(--warn)" } : { label: "Active", bg: "var(--good-tint)", fg: "var(--good)" };
              return (
                <Link key={r.id} href={`/app/transport?route=${r.id}`} style={{ display: "grid", gridTemplateColumns: "1.8fr 1.3fr 1.1fr 0.7fr 0.9fr 0.9fr", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid var(--line)", fontSize: 13, background: isSelected ? "var(--marigold-tint)" : "transparent", textDecoration: "none", color: "inherit" }}>
                  <div style={{ fontWeight: isSelected ? 700 : 600 }}>{r.name}</div>
                  <div style={{ color: "var(--muted)" }}>{r.driverName ?? "—"}</div>
                  <div className="mono" style={{ color: "var(--muted)" }}>{r.vehicleNo ?? "—"}</div>
                  <div className="mono">{r.capacity ?? "—"}</div>
                  <div className="mono" style={{ fontWeight: 600 }}>
                    {r.assignments.length}
                    {r.capacity ? `/${r.capacity}` : ""}
                  </div>
                  <div>
                    <span className="pill" style={{ background: status.bg, color: status.fg }}>
                      {status.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>
          {selected ? (
            <>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {selected.driverName ?? "No driver assigned"} · {selected.vehicleNo ?? "—"} · {selected.assignments.length}
                  {selected.capacity ? ` of ${selected.capacity}` : ""} seats
                </div>
              </div>
              {selected.capacity && (
                <div style={{ height: 9, borderRadius: 5, background: "var(--marigold-tint)" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, (selected.assignments.length / selected.capacity) * 100)}%`, borderRadius: 5, background: "var(--marigold)" }} />
                </div>
              )}
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, flex: 1, overflowY: "auto" }}>
                <div style={{ fontSize: 11.5, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Stop list · pickup times</div>
                {selected.stops.length === 0 && <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>No stops added yet.</div>}
                {selected.stops.map((stop) => (
                  <div key={stop.id} style={{ display: "flex", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--marigold)", flex: "none" }} />
                      <div style={{ width: 1.5, flex: 1, background: "var(--line)", minHeight: 20 }} />
                    </div>
                    <div style={{ paddingBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{stop.stopName}</div>
                      {stop.pickupTime && (
                        <div className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>
                          {stop.pickupTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {canEdit && (
                  <div style={{ marginTop: 8 }}>
                    <AddStopForm routeId={selected.id} />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 13.5 }}>No route selected.</div>
          )}
        </div>
      </div>
    </div>
  );
}

async function HostelTab({ selectedRoomId, canEdit, sdb }: { selectedRoomId?: string; canEdit: boolean; sdb: Awaited<ReturnType<typeof getScopedDb>> }) {
  const [rooms, unassignedStudents] = await Promise.all([
    sdb.hostelRoom.findMany({ include: { allocations: { include: { student: { include: { class: true } } } } }, orderBy: { roomNo: "asc" } }),
    sdb.student.findMany({ where: { status: "ACTIVE", hostelAllocations: { none: {} } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const totalBeds = rooms.reduce((s, r) => s + r.capacity, 0);
  const occupied = rooms.reduce((s, r) => s + r.allocations.length, 0);
  const available = totalBeds - occupied;
  const occupancyPct = totalBeds ? Math.round((occupied / totalBeds) * 100) : 0;

  const selected = rooms.find((r) => r.id === selectedRoomId) ?? rooms[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, minHeight: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 13 }}>
        <Stat label="Total rooms" value={rooms.length} />
        <Stat label="Occupied beds" value={occupied} color="var(--teal)" />
        <Stat label="Available beds" value={available} color="var(--good)" />
        <Stat label="Occupancy %" value={`${occupancyPct}%`} color="var(--marigold-deep)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16, flex: 1, minHeight: 0 }}>
        <div className="card" style={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 0.8fr 0.9fr 1fr", padding: "13px 20px", borderBottom: "1px solid var(--line)", fontSize: 10.5, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <div>Room No.</div>
            <div>Occupancy</div>
            <div>Capacity</div>
            <div>Occupied</div>
            <div>Status</div>
          </div>
          <div style={{ overflowY: "auto" }}>
            {rooms.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>No hostel rooms set up yet.</div>}
            {rooms.map((r) => {
              const isSelected = r.id === selected?.id;
              const full = r.allocations.length >= r.capacity;
              const status = full ? { label: "Full", bg: "var(--teal-tint)", fg: "var(--teal)" } : { label: "Available", bg: "var(--good-tint)", fg: "var(--good)" };
              return (
                <Link key={r.id} href={`/app/transport?tab=hostel&room=${r.id}`} style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 0.8fr 0.9fr 1fr", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid var(--line)", fontSize: 13, background: isSelected ? "var(--marigold-tint)" : "transparent", textDecoration: "none", color: "inherit" }}>
                  <div style={{ fontWeight: isSelected ? 700 : 600 }}>{r.roomNo}</div>
                  <div style={{ color: "var(--muted)" }}>—</div>
                  <div className="mono">{r.capacity}</div>
                  <div className="mono" style={{ fontWeight: 600 }}>{r.allocations.length}</div>
                  <div>
                    <span className="pill" style={{ background: status.bg, color: status.fg }}>
                      {status.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>
          {selected ? (
            <>
              {canEdit && <AllocateForm roomId={selected.id} students={unassignedStudents} />}
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, flex: 1, overflowY: "auto" }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>{selected.roomNo} roster</div>
                <div className="mono" style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
                  {selected.allocations.length} of {selected.capacity} beds occupied
                </div>
                <div style={{ height: 9, borderRadius: 5, background: "var(--marigold-tint)", marginBottom: 16 }}>
                  <div style={{ height: "100%", width: `${Math.min(100, (selected.allocations.length / selected.capacity) * 100)}%`, borderRadius: 5, background: "var(--marigold)" }} />
                </div>
                {selected.allocations.length === 0 ? (
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>No students allocated yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {selected.allocations.map((a) => (
                      <div key={a.studentId}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{a.student.name}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 4px" }}>
                          Class {a.student.class.grade}-{a.student.class.section}
                        </div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--faint)" }}>
                          Moved in {a.dateFrom.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 13.5 }}>No room selected.</div>
          )}
        </div>
      </div>
    </div>
  );
}

async function ParentTransportView() {
  const session = await auth();
  const sdb = await getScopedDb();

  const parent = await sdb.parent.findUnique({
    where: { userId: session!.user.id },
    include: {
      studentLinks: {
        include: {
          student: {
            include: {
              transportAssignment: { include: { route: true, stop: true } },
              hostelAllocations: { include: { room: true }, orderBy: { dateFrom: "desc" }, take: 1 },
            },
          },
        },
      },
    },
  });
  const students = parent?.studentLinks.map((l) => l.student) ?? [];

  return (
    <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="disp" style={{ fontSize: 21 }}>
        Transport &amp; Hostel
      </div>
      {students.length === 0 && <div style={{ color: "var(--muted)" }}>No students linked to your account.</div>}
      {students.map((s) => (
        <div key={s.id} className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 14 }}>{s.name}</div>
          {s.transportAssignment ? (
            <div style={{ fontSize: 13.5, marginBottom: 10 }}>
              <div style={{ fontWeight: 600 }}>{s.transportAssignment.route.name}</div>
              <div style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 2 }}>
                Pickup: {s.transportAssignment.stop.stopName}
                {s.transportAssignment.stop.pickupTime && ` · ${s.transportAssignment.stop.pickupTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`}
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 10 }}>Not assigned to a transport route.</div>
          )}
          {s.hostelAllocations[0] && (
            <div style={{ fontSize: 13, color: "var(--muted)" }}>Hostel room: <b style={{ color: "var(--ink)" }}>{s.hostelAllocations[0].room.roomNo}</b></div>
          )}
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="card" style={{ padding: "14px 17px" }}>
      <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 6 }}>{label}</div>
      <div className="mono" style={{ fontSize: 21, fontWeight: 700, color: color ?? "var(--ink)" }}>
        {value}
      </div>
    </div>
  );
}

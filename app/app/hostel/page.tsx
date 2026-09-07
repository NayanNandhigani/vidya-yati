import Link from "next/link";
import { auth } from "@/auth";
import { getScopedDb } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";
import { studentName } from "@/lib/format";
import { hasFeature } from "@/lib/feature-flags";
import AllocateForm from "./AllocateForm";
import { RoomTypeWardenEditor, MessMenuEditor, VisitorLogPanel, OutingRequestsPanel, ParentOutingRequestForm } from "./HostelDepthPanel";

export default async function HostelPage({ searchParams }: { searchParams: Promise<{ room?: string }> }) {
  const session = await auth();
  const sdb = await getScopedDb();

  if (session!.user.role === "PARENT") {
    return <ParentHostelView />;
  }

  const accessLevel = await requireModuleAccess("Hostel", "VIEW");
  const canEdit = accessLevel === "EDIT";
  const params = await searchParams;

  const [rooms, unassignedStudents, showHostelOps] = await Promise.all([
    sdb.hostelRoom.findMany({ include: { allocations: { include: { student: { include: { class: true } } } }, warden: { include: { user: true } } }, orderBy: { roomNo: "asc" } }),
    sdb.student.findMany({ where: { status: "ACTIVE", hostelAllocations: { none: {} } }, orderBy: [{ firstName: "asc" }, { surname: "asc" }], select: { id: true, firstName: true, surname: true } }),
    hasFeature(session!.user.schoolId, "hostel.operations"),
  ]);

  const [staffOptions, messMenus, visitorLogs, outingRequests] = showHostelOps
    ? await Promise.all([
        sdb.staffProfile.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } }),
        sdb.hostelMessMenu.findMany(),
        sdb.hostelVisitorLog.findMany({ include: { student: true }, orderBy: { checkInAt: "desc" }, take: 30 }),
        sdb.hostelOutingRequest.findMany({ include: { student: true }, orderBy: { requestedAt: "desc" }, take: 30 }),
      ])
    : [[], [], [], []];

  const totalBeds = rooms.reduce((s, r) => s + r.capacity, 0);
  const occupied = rooms.reduce((s, r) => s + r.allocations.length, 0);
  const available = totalBeds - occupied;
  const occupancyPct = totalBeds ? Math.round((occupied / totalBeds) * 100) : 0;

  const selected = rooms.find((r) => r.id === params.room) ?? rooms[0];
  const roomResidents = selected ? selected.allocations.map((a) => ({ id: a.studentId, name: studentName(a.student) })) : [];

  return (
    <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 16, height: "100dvh", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="disp" style={{ fontSize: 21 }}>
          Hostel
        </div>
        {canEdit && (
          <Link href="/app/hostel/new-room" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 15px", fontSize: 13, fontWeight: 600, textDecoration: "none", color: "var(--ink)" }}>
            + Add room
          </Link>
        )}
      </div>

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
                <Link key={r.id} href={`/app/hostel?room=${r.id}`} style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 0.8fr 0.9fr 1fr", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid var(--line)", fontSize: 13, background: isSelected ? "var(--marigold-tint)" : "transparent", textDecoration: "none", color: "inherit" }}>
                  <div style={{ fontWeight: isSelected ? 700 : 600 }}>{r.roomNo}</div>
                  <div style={{ color: "var(--muted)" }}>{r.roomType ?? "—"}</div>
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

        <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          {selected ? (
            <>
              {canEdit && <AllocateForm roomId={selected.id} students={unassignedStudents} />}
              {showHostelOps && canEdit && (
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <div style={{ fontSize: 11.5, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Room type &amp; warden</div>
                  <RoomTypeWardenEditor
                    roomId={selected.id}
                    roomType={selected.roomType}
                    wardenStaffId={selected.wardenStaffId}
                    staffOptions={staffOptions.map((s) => ({ id: s.id, name: s.user.name ?? "Staff" }))}
                  />
                </div>
              )}
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, flex: 1, overflowY: "auto" }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>{selected.roomNo} roster</div>
                {showHostelOps && selected.warden && (
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 6 }}>Warden: {selected.warden.user.name}</div>
                )}
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
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{studentName(a.student)}</div>
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

      {showHostelOps && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <MessMenuEditor menus={messMenus.map((m) => ({ dayOfWeek: m.dayOfWeek, mealType: m.mealType, menuText: m.menuText }))} />
          <VisitorLogPanel
            students={roomResidents}
            logs={visitorLogs.map((l) => ({ id: l.id, studentName: studentName(l.student), visitorName: l.visitorName, relation: l.relation, purpose: l.purpose, checkInAt: l.checkInAt.toISOString(), checkOutAt: l.checkOutAt?.toISOString() ?? null }))}
          />
          <OutingRequestsPanel
            requests={outingRequests.map((r) => ({ id: r.id, studentName: studentName(r.student), reason: r.reason, dateFrom: r.dateFrom.toISOString(), dateTo: r.dateTo.toISOString(), status: r.status }))}
          />
        </div>
      )}
    </div>
  );
}

async function ParentHostelView() {
  const session = await auth();
  const sdb = await getScopedDb();

  const parent = await sdb.parent.findUnique({
    where: { userId: session!.user.id },
    include: {
      studentLinks: {
        include: {
          student: {
            include: {
              hostelAllocations: { include: { room: true }, orderBy: { dateFrom: "desc" }, take: 1 },
              hostelOutingRequests: { orderBy: { requestedAt: "desc" }, take: 5 },
            },
          },
        },
      },
    },
  });
  const students = parent?.studentLinks.map((l) => l.student) ?? [];
  const showHostelOps = await hasFeature(session!.user.schoolId, "hostel.operations");

  return (
    <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="disp" style={{ fontSize: 21 }}>
        Hostel
      </div>
      {students.length === 0 && <div style={{ color: "var(--muted)" }}>No students linked to your account.</div>}
      {students.map((s) => (
        <div key={s.id} className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 14 }}>{studentName(s)}</div>
          {s.hostelAllocations[0] ? (
            <>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>Hostel room: <b style={{ color: "var(--ink)" }}>{s.hostelAllocations[0].room.roomNo}</b></div>
              {showHostelOps && (
                <>
                  {s.hostelOutingRequests.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      {s.hostelOutingRequests.map((r) => {
                        const color = r.status === "APPROVED" ? "var(--good)" : r.status === "REJECTED" ? "var(--critical)" : "var(--warn)";
                        return (
                          <div key={r.id} style={{ fontSize: 11.5, display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--muted)" }}>
                              {r.reason} ({r.dateFrom.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}–{r.dateTo.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })})
                            </span>
                            <span style={{ fontWeight: 700, color }}>{r.status}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <ParentOutingRequestForm studentId={s.id} />
                </>
              )}
            </>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 13.5 }}>Not allocated a hostel room.</div>
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

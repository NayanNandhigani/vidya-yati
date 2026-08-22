import Link from "next/link";
import { auth } from "@/auth";
import { getScopedDb } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";
import { initials } from "@/lib/format";
import { avatarColorFor } from "@/lib/academic";
import StaffDetailTabs from "./StaffDetailTabs";

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ staff?: string; q?: string }> }) {
  await requireModuleAccess("Employees", "VIEW");
  const session = await auth();
  const isAdmin = session!.user.role === "SCHOOL_ADMIN";
  const params = await searchParams;
  const sdb = await getScopedDb();

  const staffList = await sdb.staffProfile.findMany({
    where: params.q
      ? { user: { name: { contains: params.q, mode: "insensitive" } } }
      : undefined,
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });

  const totalStaff = staffList.length;
  const teachingStaff = staffList.filter((s) => (s.designation ?? "").toLowerCase().includes("teacher")).length;
  const onLeaveToday = staffList.filter((s) => s.employmentStatus === "ON_LEAVE").length;

  const selectedId = params.staff ?? staffList[0]?.id;
  const selected = selectedId ? staffList.find((s) => s.id === selectedId) : undefined;

  let detailData = null;
  if (selected) {
    const [attendanceGroups, recentAttendance, payrollRuns, permissions] = await Promise.all([
      sdb.staffAttendance.groupBy({ by: ["status"], where: { staffId: selected.id }, _count: true }),
      sdb.staffAttendance.findMany({ where: { staffId: selected.id }, orderBy: { date: "desc" }, take: 10 }),
      sdb.payrollRun.findMany({ where: { staffId: selected.id }, orderBy: { month: "desc" } }),
      sdb.staffPermission.findMany({ where: { staffId: selected.id } }),
    ]);
    const attendanceTotals = { PRESENT: 0, ABSENT: 0, HALF_DAY: 0 };
    for (const g of attendanceGroups) attendanceTotals[g.status] = g._count;

    detailData = {
      staff: {
        id: selected.id,
        designation: selected.designation,
        department: selected.department,
        dateJoined: selected.dateJoined?.toISOString() ?? null,
        employmentStatus: selected.employmentStatus,
        user: { name: selected.user.name, email: selected.user.email, phone: selected.user.phone },
      },
      attendanceTotals,
      recentAttendance: recentAttendance.map((a) => ({ date: a.date.toISOString(), status: a.status })),
      payrollRuns: payrollRuns.map((p) => ({ month: p.month, amount: Number(p.amount), status: p.status, paidOn: p.paidOn?.toISOString() ?? null })),
      permissions: Object.fromEntries(permissions.map((p) => [p.moduleName, p.accessLevel])),
    };
  }

  return (
    <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 16, height: "100dvh", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="disp" style={{ fontSize: 21 }}>
          Employees <span className="mono" style={{ fontSize: 14, fontWeight: 500, color: "var(--faint)" }}>· {totalStaff}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <form method="GET">
            {params.staff && <input type="hidden" name="staff" value={params.staff} />}
            <input className="in" name="q" defaultValue={params.q} placeholder="Search staff…" style={{ width: 200, background: "var(--card)" }} />
          </form>
          {isAdmin && (
            <Link href="/app/employees/new" style={{ background: "var(--marigold)", color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              + Add Staff
            </Link>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 13 }}>
        <Stat label="Total staff" value={totalStaff} />
        <Stat label="Teaching staff" value={teachingStaff} color="var(--teal)" />
        <Stat label="Non-teaching staff" value={totalStaff - teachingStaff} />
        <Stat label="On leave" value={onLeaveToday} color="var(--warn)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, flex: 1, minHeight: 0 }}>
        <div className="card" style={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.9fr 1.6fr 1.1fr 1.3fr 0.9fr", padding: "13px 20px", borderBottom: "1px solid var(--line)", fontSize: 10.5, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <div>Staff</div>
            <div>Designation</div>
            <div>Department</div>
            <div>Contact</div>
            <div>Status</div>
          </div>
          <div style={{ overflowY: "auto" }}>
            {staffList.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>No staff found.</div>}
            {staffList.map((s) => {
              const isSelected = s.id === selectedId;
              return (
                <Link
                  key={s.id}
                  href={`/app/employees?staff=${s.id}${params.q ? `&q=${params.q}` : ""}`}
                  style={{ display: "grid", gridTemplateColumns: "1.9fr 1.6fr 1.1fr 1.3fr 0.9fr", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid var(--line)", background: isSelected ? "var(--marigold-tint)" : "transparent", textDecoration: "none", color: "inherit" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: avatarColorFor(s.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flex: "none" }}>
                      {initials(s.user.name)}
                    </div>
                    <div style={{ fontWeight: isSelected ? 700 : 600, fontSize: 13.5 }}>{s.user.name}</div>
                  </div>
                  <div style={{ fontSize: 12.5 }}>{s.designation ?? "—"}</div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{s.department ?? "—"}</div>
                  <div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                    {s.user.phone ?? "—"}
                  </div>
                  <div>
                    <span className="pill" style={{ background: s.employmentStatus === "ACTIVE" ? "var(--good-tint)" : "var(--warn-tint)", color: s.employmentStatus === "ACTIVE" ? "var(--good)" : "var(--warn)" }}>
                      {s.employmentStatus === "ACTIVE" ? "Active" : "On Leave"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {detailData ? (
          <StaffDetailTabs {...detailData} isAdmin={isAdmin} />
        ) : (
          <div className="card" style={{ padding: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
            No staff selected.
          </div>
        )}
      </div>
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

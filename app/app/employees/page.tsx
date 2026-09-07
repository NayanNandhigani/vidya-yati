import Link from "next/link";
import { auth } from "@/auth";
import { getScopedDb } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";
import { initials } from "@/lib/format";
import { avatarColorFor } from "@/lib/academic";
import { SortableHeader, resolveSort } from "@/components/SortableHeader";
import type { Prisma } from "@prisma/client";
import { hasFeature } from "@/lib/feature-flags";
import { getStaffLeaveSummary } from "./hr-depth-actions";
import StaffDetailTabs from "./StaffDetailTabs";
import StatutoryRatesPanel from "./StatutoryRatesPanel";

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ staff?: string; q?: string; sortBy?: string; sortDir?: string }> }) {
  await requireModuleAccess("Employees", "VIEW");
  const session = await auth();
  const isAdmin = session!.user.role === "SCHOOL_ADMIN";
  const params = await searchParams;
  const sdb = await getScopedDb();

  const orderBy = resolveSort<Prisma.StaffProfileOrderByWithRelationInput>(
    params,
    {
      name: (dir) => ({ user: { name: dir } }),
      designation: (dir) => ({ designation: dir }),
      department: (dir) => ({ department: dir }),
      contact: (dir) => ({ user: { phone: dir } }),
      status: (dir) => ({ employmentStatus: dir }),
    },
    { user: { name: "asc" } }
  );

  const staffList = await sdb.staffProfile.findMany({
    where: params.q
      ? { user: { name: { contains: params.q, mode: "insensitive" } } }
      : undefined,
    include: { user: true },
    orderBy,
  });

  const totalStaff = staffList.length;
  const teachingStaff = staffList.filter((s) => (s.designation ?? "").toLowerCase().includes("teacher")).length;
  const onLeaveToday = staffList.filter((s) => s.employmentStatus === "ON_LEAVE").length;

  const selectedId = params.staff ?? staffList[0]?.id;
  const selected = selectedId ? staffList.find((s) => s.id === selectedId) : undefined;

  let detailData = null;
  const showDocuments = await hasFeature(session!.user.schoolId, "employees.documents");
  const showStructuredPayroll = await hasFeature(session!.user.schoolId, "payroll.structuredSalary");
  const showLeave = await hasFeature(session!.user.schoolId, "employees.leave");
  if (selected) {
    const [attendanceGroups, recentAttendance, payrollRuns, permissions, classes, documents, salaryComponents, allLeaveTypes, leaveRequests, pendingLeaveRequestsRaw, leaveSummary] = await Promise.all([
      sdb.staffAttendance.groupBy({ by: ["status"], where: { staffId: selected.id }, _count: true }),
      sdb.staffAttendance.findMany({ where: { staffId: selected.id }, orderBy: { date: "desc" }, take: 10 }),
      sdb.payrollRun.findMany({ where: { staffId: selected.id }, orderBy: { month: "desc" } }),
      sdb.staffPermission.findMany({ where: { staffId: selected.id } }),
      sdb.class.findMany({ orderBy: [{ grade: "asc" }, { section: "asc" }] }),
      showDocuments ? sdb.personDocument.findMany({ where: { staffId: selected.id, subjectType: "STAFF" }, orderBy: { uploadedAt: "desc" } }) : Promise.resolve([]),
      showStructuredPayroll ? sdb.salaryComponent.findMany({ where: { staffId: selected.id } }) : Promise.resolve([]),
      showLeave ? sdb.staffLeaveType.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
      showLeave ? sdb.staffLeaveRequest.findMany({ where: { staffId: selected.id }, include: { leaveType: true }, orderBy: { requestedAt: "desc" } }) : Promise.resolve([]),
      showLeave && isAdmin ? sdb.staffLeaveRequest.findMany({ where: { status: "PENDING" }, include: { leaveType: true, staff: { include: { user: true } } }, orderBy: { requestedAt: "desc" } }) : Promise.resolve([]),
      showLeave ? getStaffLeaveSummary(selected.id) : Promise.resolve([]),
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
        user: { name: selected.user.name, username: selected.user.username, phone: selected.user.phone },
        qualifications: selected.qualifications,
        specialization: selected.specialization,
        shiftStart: selected.shiftStart,
        isSelf: selected.userId === session!.user.id,
      },
      attendanceTotals,
      recentAttendance: recentAttendance.map((a) => ({ date: a.date.toISOString(), status: a.status, checkInTime: a.checkInTime })),
      payrollRuns: payrollRuns.map((p) => ({
        month: p.month,
        amount: Number(p.amount),
        status: p.status,
        paidOn: p.paidOn?.toISOString() ?? null,
        grossAmount: p.grossAmount ? Number(p.grossAmount) : null,
        pfAmount: p.pfAmount ? Number(p.pfAmount) : null,
        esiAmount: p.esiAmount ? Number(p.esiAmount) : null,
        tdsAmount: p.tdsAmount ? Number(p.tdsAmount) : null,
        ptAmount: p.ptAmount ? Number(p.ptAmount) : null,
        lopAmount: p.lopAmount ? Number(p.lopAmount) : null,
      })),
      permissions: permissions.map((p) => ({ moduleName: p.moduleName, classId: p.classId, accessLevel: p.accessLevel })),
      classes: classes.map((c) => ({ id: c.id, grade: c.grade, section: c.section })),
      salaryComponents: salaryComponents.map((c) => ({ id: c.id, name: c.name, amount: Number(c.amount) })),
      documents: documents.map((d) => ({
        id: d.id,
        category: d.category,
        label: d.label,
        filePath: d.filePath,
        expiryDate: d.expiryDate?.toISOString() ?? null,
        uploadedAt: d.uploadedAt.toISOString(),
      })),
      showLeave,
      leaveTypes: leaveSummary,
      allLeaveTypes: allLeaveTypes.map((t) => ({ id: t.id, name: t.name })),
      leaveRequests: leaveRequests.map((r) => ({ id: r.id, leaveTypeName: r.leaveType.name, dateFrom: r.dateFrom.toISOString(), dateTo: r.dateTo.toISOString(), reason: r.reason, status: r.status })),
      pendingLeaveRequests: pendingLeaveRequestsRaw.map((r) => ({ id: r.id, leaveTypeName: r.leaveType.name, dateFrom: r.dateFrom.toISOString(), dateTo: r.dateTo.toISOString(), reason: r.reason, status: r.status, staffName: r.staff.user.name })),
    };
  }

  const school = showStructuredPayroll && isAdmin
    ? await sdb.school.findUnique({ where: { id: session!.user.schoolId! }, select: { pfPercent: true, esiPercent: true, ptFixedAmount: true, tdsPercent: true } })
    : null;

  return (
    <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 16, height: "100dvh", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="disp" style={{ fontSize: 21 }}>
          Employees <span className="mono" style={{ fontSize: 14, fontWeight: 500, color: "var(--faint)" }}>· {totalStaff}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {school && (
            <StatutoryRatesPanel
              pfPercent={school.pfPercent ? Number(school.pfPercent) : null}
              esiPercent={school.esiPercent ? Number(school.esiPercent) : null}
              ptFixedAmount={school.ptFixedAmount ? Number(school.ptFixedAmount) : null}
              tdsPercent={school.tdsPercent ? Number(school.tdsPercent) : null}
            />
          )}
          <form method="GET">
            {params.staff && <input type="hidden" name="staff" value={params.staff} />}
            {params.sortBy && <input type="hidden" name="sortBy" value={params.sortBy} />}
            {params.sortDir && <input type="hidden" name="sortDir" value={params.sortDir} />}
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
            <div><SortableHeader label="Staff" field="name" basePath="/app/employees" currentParams={params} /></div>
            <div><SortableHeader label="Designation" field="designation" basePath="/app/employees" currentParams={params} /></div>
            <div><SortableHeader label="Department" field="department" basePath="/app/employees" currentParams={params} /></div>
            <div><SortableHeader label="Contact" field="contact" basePath="/app/employees" currentParams={params} /></div>
            <div><SortableHeader label="Status" field="status" basePath="/app/employees" currentParams={params} /></div>
          </div>
          <div style={{ overflowY: "auto" }}>
            {staffList.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>No staff found.</div>}
            {staffList.map((s) => {
              const isSelected = s.id === selectedId;
              return (
                <Link
                  key={s.id}
                  href={`/app/employees?staff=${s.id}${params.q ? `&q=${params.q}` : ""}${params.sortBy ? `&sortBy=${params.sortBy}` : ""}${params.sortDir ? `&sortDir=${params.sortDir}` : ""}`}
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
          <StaffDetailTabs {...detailData} isAdmin={isAdmin} showDocuments={showDocuments} showStructuredPayroll={showStructuredPayroll} />
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

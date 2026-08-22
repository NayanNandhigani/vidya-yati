import { auth } from "@/auth";
import { getScopedDb } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";
import { formatINR } from "@/lib/format";
import { feeStatusFor, FEE_STATUS_STYLE } from "@/lib/academic";
import FeesView from "./FeesView";

export default async function FeesPage() {
  const session = await auth();
  const sdb = await getScopedDb();

  if (session!.user.role === "PARENT") {
    return <ParentFeesView />;
  }

  const accessLevel = await requireModuleAccess("Fees", "VIEW");
  const canEdit = accessLevel === "EDIT" || accessLevel === "FULL";

  const currentYear = await sdb.academicYear.findFirst({ where: { isCurrent: true } });
  const structures = currentYear ? await sdb.feeStructure.findMany({ where: { yearId: currentYear.id } }) : [];
  const structuresByClass = new Map<string, typeof structures>();
  for (const fs of structures) structuresByClass.set(fs.classId, [...(structuresByClass.get(fs.classId) ?? []), fs]);

  const students = await sdb.student.findMany({
    where: { status: "ACTIVE" },
    include: { class: true, feePayments: { orderBy: { paidOn: "desc" } } },
    orderBy: { name: "asc" },
  });

  const rows = students.map((s) => {
    const classStructures = structuresByClass.get(s.classId) ?? [];
    const total = classStructures.reduce((sum, fs) => sum + Number(fs.amount), 0);
    const paid = s.feePayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const pending = Math.max(0, total - paid);
    const hasOverdue = classStructures.some((fs) => fs.dueDate < new Date()) && paid < total;
    return {
      id: s.id,
      name: s.name,
      className: `${s.class.grade}-${s.class.section}`,
      total,
      paid,
      pending,
      status: feeStatusFor(total, paid, hasOverdue),
      recentPayments: s.feePayments.slice(0, 5).map((p) => ({ paidOn: p.paidOn.toISOString(), method: p.method, amount: Number(p.amount) })),
    };
  });

  const totalBilled = rows.reduce((s, r) => s + r.total, 0);
  const totalCollected = rows.reduce((s, r) => s + r.paid, 0);
  const totalPending = rows.reduce((s, r) => s + r.pending, 0);
  const overdueCount = rows.filter((r) => r.status === "OVERDUE").length;

  return (
    <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 16, height: "100dvh", boxSizing: "border-box" }}>
      <div className="disp" style={{ fontSize: 21 }}>
        Fees {currentYear && <span style={{ fontSize: 14, fontWeight: 500, color: "var(--faint)" }}>· {currentYear.label}</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 13 }}>
        <Stat label="Total billed" value={formatINR(totalBilled)} />
        <Stat label="Collected" value={formatINR(totalCollected)} color="var(--good)" />
        <Stat label="Pending" value={formatINR(totalPending)} color="var(--warn)" />
        <Stat label="Overdue accounts" value={overdueCount} color="var(--critical)" />
      </div>

      <FeesView rows={rows} canEdit={canEdit} />
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

async function ParentFeesView() {
  const session = await auth();
  const sdb = await getScopedDb();

  const parent = await sdb.parent.findUnique({
    where: { userId: session!.user.id },
    include: {
      studentLinks: {
        include: {
          student: { include: { class: true, feePayments: { orderBy: { paidOn: "desc" } } } },
        },
      },
    },
  });

  const students = parent?.studentLinks.map((l) => l.student) ?? [];
  const currentYear = await sdb.academicYear.findFirst({ where: { isCurrent: true } });

  const studentFeeData = await Promise.all(
    students.map(async (s) => {
      const structures = currentYear ? await sdb.feeStructure.findMany({ where: { classId: s.classId, yearId: currentYear.id }, orderBy: { dueDate: "asc" } }) : [];
      const total = structures.reduce((sum, fs) => sum + Number(fs.amount), 0);
      const paid = s.feePayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const paidTerms = new Set(s.feePayments.map((p) => p.feeStructureId));
      return { student: s, structures, total, paid, paidTerms };
    })
  );

  return (
    <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="disp" style={{ fontSize: 21 }}>
        Fees
      </div>
      {students.length === 0 && <div style={{ color: "var(--muted)" }}>No students linked to your account.</div>}
      {studentFeeData.map(({ student: s, structures, total, paid, paidTerms }) => {
        return (
          <div key={s.id} className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 15.5, fontWeight: 700 }}>{s.name}</div>
              <div className="mono" style={{ fontSize: 13, color: "var(--muted)" }}>
                {formatINR(paid)} / {formatINR(total)}
              </div>
            </div>
            {structures.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 13.5 }}>No fee structure set for this class yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {structures.map((fs) => {
                  const paidThis = paidTerms.has(fs.id);
                  const overdue = !paidThis && fs.dueDate < new Date();
                  const style = FEE_STATUS_STYLE[paidThis ? "PAID" : overdue ? "OVERDUE" : "PENDING"];
                  return (
                    <div key={fs.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 0.9fr auto", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--paper)", borderRadius: 8 }}>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{fs.term}</div>
                        <div style={{ fontSize: 10.5, color: "var(--faint)" }}>{paidThis ? "Paid" : `Due ${fs.dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`}</div>
                      </div>
                      <div className="mono" style={{ fontWeight: 700, textAlign: "right" }}>
                        {formatINR(Number(fs.amount))}
                      </div>
                      <span className="pill" style={{ background: style.bg, color: style.fg }}>
                        {style.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

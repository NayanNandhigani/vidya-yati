import Link from "next/link";
import { db } from "@/lib/db";
import OnboardForm from "./OnboardForm";
import SchoolEditForm from "./SchoolEditForm";
import RelationshipManagerField from "./RelationshipManagerField";
import SchoolNotes from "./SchoolNotes";
import ModuleUsageChart from "./ModuleUsageChart";

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  ACTIVE: { bg: "var(--good-tint)", fg: "var(--good)", label: "Active" },
  TRIAL: { bg: "var(--info-tint)", fg: "var(--info)", label: "Trial" },
  EXPIRING: { bg: "var(--warn-tint)", fg: "var(--warn)", label: "Expiring soon" },
  OVERDUE: { bg: "var(--critical-tint)", fg: "var(--critical)", label: "Overdue" },
  CANCELLED: { bg: "var(--line)", fg: "var(--faint)", label: "Cancelled" },
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default async function SchoolsPage({ searchParams }: { searchParams: Promise<{ school?: string; new?: string }> }) {
  const params = await searchParams;

  const schools = await db.school.findMany({
    orderBy: { onboardedOn: "desc" },
    include: { users: { where: { role: "SCHOOL_ADMIN" }, take: 1 } },
  });
  const studentCounts = await db.student.groupBy({ by: ["schoolId"], where: { status: "ACTIVE" }, _count: true });
  const countMap = new Map(studentCounts.map((s) => [s.schoolId, s._count]));

  const total = schools.length;
  const active = schools.filter((s) => s.status === "ACTIVE").length;
  const trial = schools.filter((s) => s.status === "TRIAL").length;
  const issues = schools.filter((s) => s.status === "EXPIRING" || s.status === "OVERDUE").length;

  const selected = schools.find((s) => s.id === params.school);

  return (
    <div style={{ padding: "28px 36px", display: "flex", flexDirection: "column", gap: 18, height: "100dvh", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="disp" style={{ fontSize: 22 }}>
            Schools
          </div>
          <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 2 }}>Every school onboarded onto the Vidya Yati platform</div>
        </div>
        <Link href="/super-admin/schools?new=1" style={{ background: "var(--marigold)", color: "#fff", borderRadius: 8, padding: "9px 16px", fontSize: 13.5, fontWeight: 600, textDecoration: "none" }}>
          + Onboard a school
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <Stat label="Total schools" value={total} />
        <Stat label="Active" value={active} color="var(--good)" />
        <Stat label="Trial" value={trial} color="var(--info)" />
        <Stat label="Expiring / overdue" value={issues} color="var(--warn)" warnBg />
      </div>

      {issues > 0 && (
        <div style={{ background: "var(--warn-tint)", border: "1px solid #EED9B4", borderRadius: 10, padding: "13px 18px", fontSize: 13.5, color: "#7A5407" }}>
          <b>
            {issues} school{issues === 1 ? "" : "s"}
          </b>{" "}
          need attention — renewals expiring soon or payments overdue.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, flex: 1, minHeight: 0 }}>
        <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Schools directory</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
              Showing <span className="mono">{total}</span> schools
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1.2fr 1fr 0.85fr 1.15fr 1.15fr", fontSize: 11, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.04em", paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
            <div>School</div>
            <div>City</div>
            <div>Plan</div>
            <div>Students</div>
            <div>Status</div>
            <div>Onboarded</div>
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {schools.map((s) => {
              const style = STATUS_STYLE[s.status];
              const isSelected = s.id === selected?.id;
              return (
                <Link key={s.id} href={`/super-admin/schools?school=${s.id}`} style={{ display: "grid", gridTemplateColumns: "2.2fr 1.2fr 1fr 0.85fr 1.15fr 1.15fr", alignItems: "center", padding: "13px 0", borderBottom: "1px solid var(--line)", fontSize: 13.5, textDecoration: "none", color: "inherit", background: isSelected ? "var(--marigold-tint)" : "transparent" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <div className="mono" style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 1 }}>
                      {s.code}
                    </div>
                  </div>
                  <div style={{ color: "var(--muted)" }}>{s.city ?? "—"}</div>
                  <div style={{ color: "var(--muted)" }}>{s.plan === "STANDARD" ? "Standard" : "Premium"}</div>
                  <div className="mono">{countMap.get(s.id) ?? 0}</div>
                  <div>
                    <span className="pill" style={{ background: style.bg, color: style.fg }}>
                      {style.label}
                    </span>
                  </div>
                  <div className="mono" style={{ color: "var(--muted)" }}>
                    {s.onboardedOn.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
          {params.new ? (
            <OnboardForm />
          ) : selected ? (
            <SchoolDetail school={selected} studentCount={countMap.get(selected.id) ?? 0} />
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              Select a school from the directory to view its profile, or onboard a new one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function SchoolDetail({ school, studentCount }: { school: Awaited<ReturnType<typeof db.school.findMany>>[number] & { users: { name: string; username: string }[] }; studentCount: number }) {
  const admin = school.users[0];
  const style = STATUS_STYLE[school.status];
  const since = new Date(Date.now() - THIRTY_DAYS_MS);

  const [staffCount, classCount, staffTotal, staffActivated, parentTotal, parentActivated, loginsLast30d, lastLoginAgg, moduleUsageRaw, notesRaw] = await Promise.all([
    db.staffProfile.count({ where: { schoolId: school.id } }),
    db.class.count({ where: { schoolId: school.id } }),
    db.user.count({ where: { schoolId: school.id, role: "STAFF" } }),
    db.user.count({ where: { schoolId: school.id, role: "STAFF", lastLoginAt: { not: null } } }),
    db.user.count({ where: { schoolId: school.id, role: "PARENT" } }),
    db.user.count({ where: { schoolId: school.id, role: "PARENT", lastLoginAt: { not: null } } }),
    db.activityLog.count({ where: { schoolId: school.id, type: "LOGIN", occurredAt: { gte: since } } }),
    db.user.aggregate({ where: { schoolId: school.id }, _max: { lastLoginAt: true } }),
    db.activityLog.groupBy({ by: ["module"], where: { schoolId: school.id, type: "PAGE_VIEW", module: { not: null }, occurredAt: { gte: since } }, _count: true }),
    db.schoolNote.findMany({ where: { schoolId: school.id }, orderBy: { createdAt: "desc" }, take: 20, include: { author: { select: { name: true } } } }),
  ]);

  const moduleUsage = moduleUsageRaw
    .map((g) => ({ module: g.module as string, count: g._count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const notes = notesRaw.map((n) => ({ id: n.id, body: n.body, createdAt: n.createdAt.toISOString(), authorName: n.author.name }));
  const lastLogin = lastLoginAgg._max.lastLoginAt;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700 }}>{school.name}</div>
            <span className="mono" style={{ fontSize: 11, color: "var(--faint)" }}>
              {school.code}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            {school.city}
            {school.state ? `, ${school.state}` : ""}
          </div>
        </div>
        <Link href="/super-admin/schools" style={{ cursor: "pointer", color: "var(--muted)", fontSize: 17, textDecoration: "none" }}>
          ×
        </Link>
      </div>
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="pill" style={{ background: style.bg, color: style.fg }}>
          {style.label}
        </span>
        <SchoolEditForm school={{ id: school.id, name: school.name, code: school.code, city: school.city, state: school.state, plan: school.plan, status: school.status }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", marginTop: 14 }}>
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          <DetailRow label="Admin" value={admin?.name ?? "—"} />
          <DetailRow label="Admin username" value={admin?.username ?? "—"} mono />
          <DetailRow label="Plan" value={school.plan === "STANDARD" ? "Standard" : "Premium"} />
          <DetailRow label="Students" value={String(studentCount)} mono />
          <DetailRow label="Staff" value={String(staffCount)} mono />
          <DetailRow label="Classes" value={String(classCount)} mono />
          <DetailRow label="Onboarded" value={school.onboardedOn.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} mono last />
        </div>

        <SectionTitle>Relationship manager</SectionTitle>
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 14px" }}>
          <RelationshipManagerField schoolId={school.id} relationshipManager={school.relationshipManager} />
        </div>

        <SectionTitle>Account activation</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <ActivationRow label="Staff accounts" activated={staffActivated} total={staffTotal} />
          <ActivationRow label="Parent accounts" activated={parentActivated} total={parentTotal} />
        </div>

        <SectionTitle>Engagement</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div className="card" style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Logins — last 30 days</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 600 }}>
              {loginsLast30d}
            </div>
          </div>
          <div className="card" style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Last login</div>
            <div className="mono" style={{ fontSize: 13, fontWeight: 600, marginTop: 3 }}>
              {lastLogin ? lastLogin.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Never"}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 8 }}>Module usage — last 30 days</div>
        <ModuleUsageChart data={moduleUsage} />

        <SectionTitle>Notes</SectionTitle>
        <SchoolNotes schoolId={school.id} notes={notes} />
      </div>

      <Link href={`/super-admin/subscriptions?school=${school.id}`} style={{ marginTop: 12, textAlign: "center", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: 9, fontSize: 12.5, fontWeight: 600, color: "var(--ink)", textDecoration: "none", flex: "none" }}>
        View billing →
      </Link>
    </div>
  );
}

function DetailRow({ label, value, mono, last }: { label: string; value: string; mono?: boolean; last?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, paddingBottom: last ? 0 : 6, borderBottom: last ? undefined : "1px solid var(--line)" }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span className={mono ? "mono" : undefined} style={{ color: "var(--ink)", textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

function ActivationRow({ label, activated, total }: { label: string; activated: number; total: number }) {
  const pct = total > 0 ? Math.round((activated / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
        <span style={{ color: "var(--muted)" }}>{label}</span>
        <span className="mono" style={{ color: "var(--ink)" }}>
          {activated} / {total} activated
        </span>
      </div>
      <div style={{ height: 6, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--teal)", borderRadius: 4 }} />
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "18px 0 10px" }}>{children}</div>;
}

function Stat({ label, value, color, warnBg }: { label: string; value: React.ReactNode; color?: string; warnBg?: boolean }) {
  return (
    <div className="card" style={{ padding: "16px 18px", ...(warnBg ? { borderColor: "#EED9B4", background: "var(--warn-tint)" } : {}) }}>
      <div style={{ fontSize: 12, color: warnBg ? "var(--warn)" : "var(--muted)", marginBottom: 8, fontWeight: warnBg ? 600 : 400 }}>{label}</div>
      <div className="mono" style={{ fontSize: 25, fontWeight: 600, color: color ?? "var(--ink)" }}>
        {value}
      </div>
    </div>
  );
}

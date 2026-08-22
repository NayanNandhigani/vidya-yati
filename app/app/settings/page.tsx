import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getScopedDb } from "@/lib/tenant-db";
import GeneralForm from "./GeneralForm";
import AcademicYearsPanel from "./AcademicYearsPanel";
import WebsiteBuilderPanel from "./WebsiteBuilderPanel";
import IdCardPanel from "./IdCardPanel";

const PANELS = [
  { key: "general", label: "General" },
  { key: "years", label: "Academic Years" },
  { key: "website", label: "Website Builder" },
  { key: "idcards", label: "ID Card Templates" },
];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ panel?: string }> }) {
  const session = await auth();
  if (session!.user.role !== "SCHOOL_ADMIN") redirect("/app/dashboard");

  const params = await searchParams;
  const panel = PANELS.some((p) => p.key === params.panel) ? params.panel! : "general";
  const sdb = await getScopedDb();

  const school = await db.school.findUniqueOrThrow({ where: { id: session!.user.schoolId! } });

  return (
    <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 18, height: "100dvh", boxSizing: "border-box" }}>
      <div className="disp" style={{ fontSize: 21 }}>
        Settings
      </div>

      <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0 }}>
        <div className="card" style={{ width: 196, flex: "none", padding: 10, display: "flex", flexDirection: "column", gap: 2, height: "fit-content" }}>
          {PANELS.map((p) => (
            <Link
              key={p.key}
              href={`/app/settings?panel=${p.key}`}
              style={{ padding: "9px 12px", borderRadius: 7, fontSize: 13, fontWeight: panel === p.key ? 700 : 500, background: panel === p.key ? "var(--marigold-tint)" : "transparent", color: panel === p.key ? "var(--marigold-deep)" : "var(--ink)", textDecoration: "none" }}
            >
              {p.label}
            </Link>
          ))}
        </div>

        {panel === "general" && (
          <div className="card" style={{ flex: 1, padding: 26, overflowY: "auto" }}>
            <GeneralForm school={{ name: school.name, city: school.city, state: school.state }} />
          </div>
        )}

        {panel === "years" && (
          <div className="card" style={{ flex: 1, padding: 26, overflowY: "auto" }}>
            <YearsPanelData sdb={sdb} />
          </div>
        )}

        {panel === "website" && (
          <WebsitePanelData sdb={sdb} schoolName={school.name} schoolId={school.id} />
        )}

        {panel === "idcards" && (
          <div className="card" style={{ flex: 1, padding: 26, overflowY: "auto" }}>
            <IdCardPanelData sdb={sdb} />
          </div>
        )}
      </div>
    </div>
  );
}

async function YearsPanelData({ sdb }: { sdb: Awaited<ReturnType<typeof getScopedDb>> }) {
  const years = await sdb.academicYear.findMany({ orderBy: { startDate: "asc" } });
  return <AcademicYearsPanel years={years.map((y) => ({ id: y.id, label: y.label, startDate: y.startDate.toISOString(), endDate: y.endDate.toISOString(), isCurrent: y.isCurrent }))} />;
}

async function WebsitePanelData({ sdb, schoolName, schoolId }: { sdb: Awaited<ReturnType<typeof getScopedDb>>; schoolName: string; schoolId: string }) {
  const settings = await sdb.websiteSettings.findUnique({ where: { schoolId } });
  return (
    <WebsiteBuilderPanel
      schoolName={schoolName}
      settings={{
        tagline: settings?.tagline ?? null,
        themeColor: settings?.themeColor ?? null,
        sectionVisibility: (settings?.sectionVisibility as Record<string, boolean>) ?? {},
      }}
    />
  );
}

async function IdCardPanelData({ sdb }: { sdb: Awaited<ReturnType<typeof getScopedDb>> }) {
  const template = await sdb.idCardTemplate.findFirst();
  const config = template?.layoutConfig as { key?: string } | undefined;
  return <IdCardPanel selectedKey={config?.key ?? null} />;
}

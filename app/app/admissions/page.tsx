import Link from "next/link";
import { getScopedDb } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";
import AdmissionsBoard from "./AdmissionsBoard";

export default async function AdmissionsPage() {
  const accessLevel = await requireModuleAccess("Admissions", "VIEW");
  const canEdit = accessLevel === "EDIT" || accessLevel === "FULL";
  const sdb = await getScopedDb();

  const [enquiries, classes] = await Promise.all([
    sdb.admissionEnquiry.findMany({ orderBy: { createdAt: "desc" } }),
    sdb.class.findMany({ orderBy: [{ grade: "asc" }, { section: "asc" }] }),
  ]);

  return (
    <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 16, height: "100dvh", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="disp" style={{ fontSize: 21 }}>
          Admissions pipeline
        </div>
        {canEdit && (
          <Link href="/app/admissions/new" style={{ background: "var(--marigold)", color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            + New Enquiry
          </Link>
        )}
      </div>

      <AdmissionsBoard enquiries={enquiries} classes={classes} canEdit={canEdit} />
    </div>
  );
}

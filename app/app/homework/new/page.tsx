import { getScopedDb } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";
import NewHomeworkForm from "./NewHomeworkForm";

export default async function NewHomeworkPage() {
  await requireModuleAccess("Homework", "EDIT");
  const sdb = await getScopedDb();
  const [classes, subjects] = await Promise.all([
    sdb.class.findMany({ orderBy: [{ grade: "asc" }, { section: "asc" }] }),
    sdb.subject.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div style={{ padding: "26px 34px" }}>
      <div className="disp" style={{ fontSize: 21, marginBottom: 4 }}>
        New Assignment
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 0, marginBottom: 22 }}>Assign homework to a class.</p>
      <div className="card" style={{ padding: 24, maxWidth: 540 }}>
        <NewHomeworkForm classes={classes} subjects={subjects} />
      </div>
    </div>
  );
}

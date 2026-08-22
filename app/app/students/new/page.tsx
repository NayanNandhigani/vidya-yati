import { getScopedDb } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";
import NewStudentForm from "./NewStudentForm";

export default async function NewStudentPage() {
  await requireModuleAccess("Students", "EDIT");
  const sdb = await getScopedDb();
  const classes = await sdb.class.findMany({ orderBy: [{ grade: "asc" }, { section: "asc" }] });

  return (
    <div style={{ padding: "26px 34px" }}>
      <div className="disp" style={{ fontSize: 21, marginBottom: 4 }}>
        Add Student
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 0, marginBottom: 22 }}>Enrol a new student into a class.</p>
      <div className="card" style={{ padding: 24, maxWidth: 520 }}>
        <NewStudentForm classes={classes} />
      </div>
    </div>
  );
}

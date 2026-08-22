import { getScopedDb } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";
import NewExamForm from "./NewExamForm";

export default async function NewExamPage() {
  await requireModuleAccess("Exams", "EDIT");
  const sdb = await getScopedDb();
  const [classes, subjects] = await Promise.all([
    sdb.class.findMany({ orderBy: [{ grade: "asc" }, { section: "asc" }] }),
    sdb.subject.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div style={{ padding: "26px 34px" }}>
      <div className="disp" style={{ fontSize: 21, marginBottom: 4 }}>
        Schedule Exam
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 0, marginBottom: 22 }}>Set up a new exam and its subjects for a class.</p>
      <div className="card" style={{ padding: 24, maxWidth: 580 }}>
        <NewExamForm classes={classes} subjects={subjects} />
      </div>
    </div>
  );
}

import Link from "next/link";
import { auth } from "@/auth";
import { getScopedDb } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";
import { daysUntil } from "@/lib/format";
import CirculationPanel from "./CirculationPanel";

export default async function LibraryPage() {
  const session = await auth();
  const sdb = await getScopedDb();

  if (session!.user.role === "PARENT") {
    return <ParentLibraryView />;
  }

  const accessLevel = await requireModuleAccess("Library", "VIEW");
  const canEdit = accessLevel === "EDIT" || accessLevel === "FULL";

  const [books, students, issuedCirc] = await Promise.all([
    sdb.libraryBook.findMany({ orderBy: { title: "asc" } }),
    sdb.student.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    sdb.libraryCirculation.findMany({ where: { status: "ISSUED" }, include: { student: true, book: true }, orderBy: { dueDate: "asc" } }),
  ]);

  const totalCopies = books.reduce((s, b) => s + b.copiesTotal, 0);
  const overdueCount = issuedCirc.filter((c) => c.dueDate < new Date()).length;

  const issued = issuedCirc.map((c) => ({
    id: c.id,
    studentName: c.student.name,
    bookTitle: c.book.title,
    issueDate: c.issueDate.toISOString(),
    dueDate: c.dueDate.toISOString(),
    overdueDays: Math.max(0, -daysUntil(c.dueDate)),
  }));

  return (
    <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 16, height: "100dvh", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="disp" style={{ fontSize: 21 }}>
          Library
        </div>
        {canEdit && (
          <Link href="/app/library/new" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 15px", fontSize: 13, fontWeight: 600, textDecoration: "none", color: "var(--ink)" }}>
            + Add title
          </Link>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 13 }}>
        <Stat label="Titles in catalogue" value={books.length} />
        <Stat label="Total copies" value={totalCopies} />
        <Stat label="Currently issued" value={issuedCirc.length} color="var(--teal)" />
        <Stat label="Overdue" value={overdueCount} color="var(--critical)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16, flex: 1, minHeight: 0 }}>
        <div className="card" style={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.4fr 1.1fr 1fr 1fr 1fr", padding: "13px 20px", borderBottom: "1px solid var(--line)", fontSize: 10.5, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <div>Title</div>
            <div>Author</div>
            <div>Accession no.</div>
            <div>Category</div>
            <div>Copies (total/avail.)</div>
            <div>Status</div>
          </div>
          <div style={{ overflowY: "auto" }}>
            {books.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>No titles in the catalogue yet.</div>}
            {books.map((b) => {
              const allIssued = b.copiesAvailable === 0;
              return (
                <div key={b.id} style={{ display: "grid", gridTemplateColumns: "2fr 1.4fr 1.1fr 1fr 1fr 1fr", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                  <div style={{ fontWeight: 600 }}>{b.title}</div>
                  <div style={{ color: "var(--muted)" }}>{b.author ?? "—"}</div>
                  <div className="mono" style={{ color: "var(--muted)" }}>{b.accessionNo}</div>
                  <div style={{ color: "var(--muted)" }}>{b.category ?? "—"}</div>
                  <div className="mono" style={{ color: allIssued ? "var(--warn)" : undefined }}>
                    {b.copiesTotal} / {b.copiesAvailable}
                  </div>
                  <div>
                    <span className="pill" style={{ background: allIssued ? "var(--warn-tint)" : "var(--good-tint)", color: allIssued ? "var(--warn)" : "var(--good)" }}>
                      {allIssued ? "All issued" : "Available"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <CirculationPanel students={students} books={books.map((b) => ({ id: b.id, title: b.title, copiesAvailable: b.copiesAvailable }))} issued={issued} />
      </div>
    </div>
  );
}

async function ParentLibraryView() {
  const session = await auth();
  const sdb = await getScopedDb();

  const parent = await sdb.parent.findUnique({
    where: { userId: session!.user.id },
    include: { studentLinks: { include: { student: { include: { libraryCirculations: { include: { book: true }, orderBy: { issueDate: "desc" } } } } } } },
  });
  const students = parent?.studentLinks.map((l) => l.student) ?? [];

  return (
    <div style={{ padding: "26px 34px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="disp" style={{ fontSize: 21 }}>
        Library
      </div>
      {students.length === 0 && <div style={{ color: "var(--muted)" }}>No students linked to your account.</div>}
      {students.map((s) => (
        <div key={s.id} className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 14 }}>{s.name}</div>
          {s.libraryCirculations.length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: 13.5 }}>No books issued yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {s.libraryCirculations.map((c) => (
                <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "10px 12px", background: "var(--paper)", borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{c.book.title}</div>
                    <div style={{ fontSize: 10.5, color: "var(--faint)" }}>
                      Issued {c.issueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} · Due {c.dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </div>
                  </div>
                  <span className="pill" style={{ background: c.status === "ISSUED" ? "var(--warn-tint)" : "var(--good-tint)", color: c.status === "ISSUED" ? "var(--warn)" : "var(--good)" }}>
                    {c.status === "ISSUED" ? "Issued" : "Returned"}
                  </span>
                </div>
              ))}
            </div>
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

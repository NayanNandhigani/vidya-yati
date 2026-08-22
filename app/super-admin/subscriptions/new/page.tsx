import { db } from "@/lib/db";
import NewInvoiceForm from "./NewInvoiceForm";

export default async function NewInvoicePage() {
  const schools = await db.school.findMany({ orderBy: { name: "asc" } });
  return (
    <div style={{ padding: "28px 36px" }}>
      <div className="disp" style={{ fontSize: 21, marginBottom: 4 }}>
        Create Invoice
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 0, marginBottom: 22 }}>Bill a school for its subscription.</p>
      <div className="card" style={{ padding: 24, maxWidth: 480 }}>
        <NewInvoiceForm schools={schools} />
      </div>
    </div>
  );
}

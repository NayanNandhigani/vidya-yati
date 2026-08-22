import { requireModuleAccess } from "@/lib/permissions";
import NewEnquiryForm from "./NewEnquiryForm";

export default async function NewEnquiryPage() {
  await requireModuleAccess("Admissions", "EDIT");
  return (
    <div style={{ padding: "26px 34px" }}>
      <div className="disp" style={{ fontSize: 21, marginBottom: 4 }}>
        New Enquiry
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 0, marginBottom: 22 }}>Log a new admissions enquiry.</p>
      <div className="card" style={{ padding: 24, maxWidth: 480 }}>
        <NewEnquiryForm />
      </div>
    </div>
  );
}

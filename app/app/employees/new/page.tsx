import { redirect } from "next/navigation";
import { auth } from "@/auth";
import NewStaffForm from "./NewStaffForm";

export default async function NewStaffPage() {
  const session = await auth();
  if (session!.user.role !== "SCHOOL_ADMIN") redirect("/app/employees");

  return (
    <div style={{ padding: "26px 34px" }}>
      <div className="disp" style={{ fontSize: 21, marginBottom: 4 }}>
        Add Staff
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 0, marginBottom: 22 }}>Create a login for a new staff member. Share the password with them directly — they can't self-register.</p>
      <div className="card" style={{ padding: 24, maxWidth: 540 }}>
        <NewStaffForm />
      </div>
    </div>
  );
}

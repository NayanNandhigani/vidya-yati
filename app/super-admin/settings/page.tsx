import { auth } from "@/auth";
import AccountForms from "./AccountForms";

export default async function SuperAdminSettingsPage() {
  const session = await auth();
  return (
    <div style={{ padding: "28px 36px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="disp" style={{ fontSize: 22 }}>
        Settings
      </div>
      <div className="card" style={{ padding: 26, maxWidth: 600 }}>
        <AccountForms name={session!.user.name ?? ""} username={session!.user.username} />
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { signOutAction } from "@/app/app/actions";
import { IconHome, IconSchool, IconReceipt, IconBarChart, IconSettings, IconLogOut } from "@/components/icons";
import { initials } from "@/lib/format";

const NAV = [
  { label: "Dashboard", href: "/super-admin/dashboard", icon: IconHome },
  { label: "Schools", href: "/super-admin/schools", icon: IconSchool },
  { label: "Subscriptions & Billing", href: "/super-admin/subscriptions", icon: IconReceipt },
  { label: "Reports", href: "/super-admin/reports", icon: IconBarChart },
  { label: "Settings", href: "/super-admin/settings", icon: IconSettings },
];

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  return (
    <div style={{ display: "flex" }}>
      <aside style={{ width: 236, flex: "none", background: "var(--sidebar)", color: "#fff", display: "flex", flexDirection: "column", height: "100dvh", position: "sticky", top: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "20px 16px 14px" }}>
          <IconSchool style={{ width: 20, height: 20, color: "var(--marigold)" }} />
          <div>
            <div className="disp" style={{ fontSize: 15.5, lineHeight: 1.1 }}>
              Vidya Yati
            </div>
            <div style={{ fontSize: 10.5, color: "#7f8bb0", marginTop: 2 }}>Platform Admin</div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "0 8px" }}>
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="navitem" style={{ margin: "0 0 2px" }}>
                <Icon className="icon" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--marigold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flex: "none" }}>
            {initials(session.user.name ?? "VY")}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session.user.name}</div>
            <div style={{ fontSize: 10.5, color: "#7f8bb0" }}>Super Admin</div>
          </div>
          <form action={signOutAction}>
            <button type="submit" title="Sign out" style={{ background: "none", border: "none", color: "#aeb8d6", cursor: "pointer", padding: 4, display: "flex" }}>
              <IconLogOut style={{ width: 16, height: 16 }} />
            </button>
          </form>
        </div>
      </aside>
      <div style={{ flex: 1, minWidth: 0, background: "var(--paper)" }}>{children}</div>
    </div>
  );
}

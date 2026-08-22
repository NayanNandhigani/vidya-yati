import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/Sidebar";
import { signOutAction } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !session.user.schoolId) {
    redirect("/login");
  }

  const school = await db.school.findUniqueOrThrow({
    where: { id: session.user.schoolId },
    select: { name: true },
  });

  let visibleModules: Set<string> | null = null;
  if (session.user.role === "STAFF") {
    const staff = await db.staffProfile.findUnique({
      where: { userId: session.user.id },
      include: { permissions: { where: { accessLevel: { not: "NONE" } } } },
    });
    visibleModules = new Set(staff?.permissions.map((p) => p.moduleName) ?? []);
  }

  return (
    <div style={{ display: "flex" }}>
      <Sidebar
        role={session.user.role as "SCHOOL_ADMIN" | "STAFF" | "PARENT"}
        visibleModules={visibleModules}
        schoolName={school.name}
        userName={session.user.name ?? "User"}
        onSignOut={signOutAction}
      />
      <div style={{ flex: 1, minWidth: 0, background: "var(--paper)" }}>{children}</div>
    </div>
  );
}

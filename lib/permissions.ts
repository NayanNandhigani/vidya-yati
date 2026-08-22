import { AccessLevel } from "@prisma/client";
import { db } from "@/lib/db";
import { auth } from "@/auth";

const LEVEL_RANK: Record<AccessLevel, number> = {
  NONE: 0,
  VIEW: 1,
  EDIT: 2,
  FULL: 3,
};

/**
 * Staff permissions are per-module (see StaffPermission), not a fixed
 * "Teacher" role — call this from a module's pages/server actions to check
 * the current user can access it. School Admins implicitly have FULL access
 * to everything. Throws if the session is missing or access is insufficient.
 */
export async function requireModuleAccess(
  moduleName: string,
  minimum: AccessLevel = "VIEW"
): Promise<AccessLevel> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  if (session.user.role === "SCHOOL_ADMIN") {
    return "FULL";
  }

  if (session.user.role !== "STAFF") {
    throw new Error(`Role ${session.user.role} cannot access module "${moduleName}"`);
  }

  const staffProfile = await db.staffProfile.findUnique({
    where: { userId: session.user.id },
    include: { permissions: { where: { moduleName } } },
  });

  const level = staffProfile?.permissions[0]?.accessLevel ?? "NONE";
  if (LEVEL_RANK[level] < LEVEL_RANK[minimum]) {
    throw new Error(
      `Insufficient permission for module "${moduleName}": has ${level}, needs ${minimum}`
    );
  }
  return level;
}

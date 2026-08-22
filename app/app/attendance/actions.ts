"use server";

import { revalidatePath } from "next/cache";
import { Prisma, AttendanceStatus } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getScopedDb, scopedCreateData } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";

export async function saveAttendance(classId: string, date: string, marks: Record<string, AttendanceStatus>) {
  await requireModuleAccess("Attendance", "EDIT");
  const session = await auth();
  const sdb = await getScopedDb();

  const staffProfile =
    session!.user.role === "STAFF" ? await db.staffProfile.findUnique({ where: { userId: session!.user.id } }) : null;

  const d = new Date(`${date}T00:00:00`);

  await sdb.$transaction(
    Object.entries(marks).map(([studentId, status]) =>
      sdb.attendance.upsert({
        where: { studentId_date: { studentId, date: d } },
        update: { status, markedByStaffId: staffProfile?.id ?? null },
        create: scopedCreateData<Prisma.AttendanceUncheckedCreateInput>({
          studentId,
          date: d,
          status,
          markedByStaffId: staffProfile?.id ?? null,
        }),
      })
    )
  );

  revalidatePath("/app/attendance");
  return { success: true, savedCount: Object.keys(marks).length };
}

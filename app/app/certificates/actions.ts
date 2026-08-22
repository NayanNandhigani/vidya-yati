"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getScopedDb, scopedCreateData } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";

export async function issueCertificate(templateId: string, studentId: string) {
  await requireModuleAccess("Certificates", "EDIT");
  const session = await auth();
  const sdb = await getScopedDb();

  const staffProfile =
    session!.user.role === "STAFF" ? await db.staffProfile.findUnique({ where: { userId: session!.user.id } }) : null;

  const issued = await sdb.certificateIssued.create({
    data: scopedCreateData<Prisma.CertificateIssuedUncheckedCreateInput>({
      studentId,
      templateId,
      issuedDate: new Date(),
      issuedByStaffId: staffProfile?.id ?? null,
    }),
  });

  revalidatePath("/app/certificates");
  return { id: issued.id };
}

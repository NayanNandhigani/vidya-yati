"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getScopedDb, scopedCreateData } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";

export type EnquiryFormState = { error?: string };

export async function createEnquiry(_prevState: EnquiryFormState, formData: FormData): Promise<EnquiryFormState> {
  await requireModuleAccess("Admissions", "EDIT");
  const sdb = await getScopedDb();

  const applicantName = formData.get("applicantName");
  const parentContact = formData.get("parentContact");
  const classApplied = formData.get("classApplied");

  if (typeof applicantName !== "string" || !applicantName.trim() || typeof parentContact !== "string" || !parentContact.trim() || typeof classApplied !== "string" || !classApplied.trim()) {
    return { error: "All fields are required." };
  }

  await sdb.admissionEnquiry.create({
    data: scopedCreateData<Prisma.AdmissionEnquiryUncheckedCreateInput>({
      applicantName: applicantName.trim(),
      parentContact: parentContact.trim(),
      classApplied: classApplied.trim(),
    }),
  });

  revalidatePath("/app/admissions");
  redirect("/app/admissions");
}

export async function advanceToApplication(enquiryId: string) {
  await requireModuleAccess("Admissions", "EDIT");
  const sdb = await getScopedDb();
  await sdb.admissionEnquiry.update({ where: { id: enquiryId }, data: { stage: "APPLICATION" } });
  revalidatePath("/app/admissions");
}

export async function admitEnquiry(enquiryId: string, classId: string) {
  await requireModuleAccess("Admissions", "EDIT");
  const sdb = await getScopedDb();

  const enquiry = await sdb.admissionEnquiry.findUniqueOrThrow({ where: { id: enquiryId } });
  const count = await sdb.student.count();
  const admissionNo = `AD-${2000 + count + 1}`;

  const student = await sdb.student.create({
    data: scopedCreateData<Prisma.StudentUncheckedCreateInput>({
      name: enquiry.applicantName,
      admissionNo,
      classId,
      status: "ACTIVE",
    }),
  });

  await sdb.admissionEnquiry.update({ where: { id: enquiryId }, data: { stage: "ADMITTED", convertedStudentId: student.id } });

  revalidatePath("/app/admissions");
  revalidatePath("/app/students");
  return { studentId: student.id };
}

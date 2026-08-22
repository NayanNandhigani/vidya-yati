"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma, Gender } from "@prisma/client";
import { getScopedDb, scopedCreateData } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";

export type StudentFormState = { error?: string };

export async function createStudent(_prevState: StudentFormState, formData: FormData): Promise<StudentFormState> {
  await requireModuleAccess("Students", "EDIT");
  const sdb = await getScopedDb();

  const name = formData.get("name");
  const admissionNo = formData.get("admissionNo");
  const classId = formData.get("classId");
  const dob = formData.get("dob");
  const gender = formData.get("gender");

  if (typeof name !== "string" || !name.trim() || typeof admissionNo !== "string" || !admissionNo.trim() || typeof classId !== "string" || !classId) {
    return { error: "Name, admission number, and class are required." };
  }

  let student;
  try {
    student = await sdb.student.create({
      data: scopedCreateData<Prisma.StudentUncheckedCreateInput>({
        name: name.trim(),
        admissionNo: admissionNo.trim(),
        classId,
        dob: typeof dob === "string" && dob ? new Date(dob) : null,
        gender: typeof gender === "string" && gender ? (gender as Gender) : null,
      }),
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "A student with this admission number already exists in this class." };
    }
    throw e;
  }

  revalidatePath("/app/students");
  redirect(`/app/students?student=${student.id}`);
}

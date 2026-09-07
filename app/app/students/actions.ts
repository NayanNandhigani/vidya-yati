"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma, Gender } from "@prisma/client";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { getScopedDb, scopedCreateData } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";

export type StudentFormState = { error?: string };

export async function createStudent(_prevState: StudentFormState, formData: FormData): Promise<StudentFormState> {
  const firstName = formData.get("firstName");
  const surname = formData.get("surname");
  const admissionNo = formData.get("admissionNo");
  const classId = formData.get("classId");
  const dob = formData.get("dob");
  const gender = formData.get("gender");

  if (
    typeof firstName !== "string" || !firstName.trim() ||
    typeof surname !== "string" || !surname.trim() ||
    typeof admissionNo !== "string" || !admissionNo.trim() ||
    typeof classId !== "string" || !classId
  ) {
    return { error: "First name, surname, admission number, and class are required." };
  }

  await requireModuleAccess("Students", "EDIT", classId);
  const sdb = await getScopedDb();

  const session = await auth();
  const school = await db.school.findUnique({ where: { id: session!.user.schoolId! }, select: { maxStudents: true } });
  if (school?.maxStudents != null) {
    const activeCount = await sdb.student.count({ where: { status: "ACTIVE" } });
    if (activeCount >= school.maxStudents) {
      return { error: `This school's student limit (${school.maxStudents}) has been reached. Contact Vidya Yati to raise it.` };
    }
  }

  let student;
  try {
    student = await sdb.student.create({
      data: scopedCreateData<Prisma.StudentUncheckedCreateInput>({
        firstName: firstName.trim(),
        surname: surname.trim(),
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
  redirect(`/app/students/${student.id}`);
}

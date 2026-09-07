"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { getScopedDb, scopedCreateData } from "@/lib/tenant-db";

async function requireAdmin() {
  const session = await auth();
  if (session!.user.role !== "SCHOOL_ADMIN") throw new Error("Only a School Admin can manage the institute.");
}

export type FormState = { error?: string; success?: boolean };

export async function createClass(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const sdb = await getScopedDb();

  const grade = formData.get("grade");
  const section = formData.get("section");
  const classTeacherStaffId = formData.get("classTeacherStaffId");

  if (typeof grade !== "string" || !grade.trim() || typeof section !== "string" || !section.trim()) {
    return { error: "Grade and section are required." };
  }

  const currentYear = await sdb.academicYear.findFirst({ where: { isCurrent: true } });
  if (!currentYear) return { error: "Set an active academic year in Settings first." };

  const gradeTrim = grade.trim();
  const sectionTrim = section.trim().toUpperCase();

  const existing = await sdb.class.findFirst({ where: { yearId: currentYear.id, grade: gradeTrim, section: sectionTrim } });
  if (existing) return { error: `Class ${gradeTrim}-${sectionTrim} already exists.` };

  await sdb.class.create({
    data: scopedCreateData<Prisma.ClassUncheckedCreateInput>({
      yearId: currentYear.id,
      grade: gradeTrim,
      section: sectionTrim,
      classTeacherStaffId: typeof classTeacherStaffId === "string" && classTeacherStaffId ? classTeacherStaffId : null,
    }),
  });

  revalidatePath("/app/institute");
  return { success: true };
}

export async function setClassTeacher(classId: string, staffId: string | null) {
  await requireAdmin();
  const sdb = await getScopedDb();
  await sdb.class.update({ where: { id: classId }, data: { classTeacherStaffId: staffId } });
  revalidatePath("/app/institute");
  revalidatePath("/app/timetable");
}

export async function deleteClass(classId: string): Promise<{ error?: string }> {
  await requireAdmin();
  const sdb = await getScopedDb();

  const [students, exams, homework, timetableSlots, feeStructures, subjectTeachers] = await Promise.all([
    sdb.student.count({ where: { classId } }),
    sdb.exam.count({ where: { classId } }),
    sdb.homework.count({ where: { classId } }),
    sdb.timetableSlot.count({ where: { classId } }),
    sdb.feeStructure.count({ where: { classId } }),
    sdb.classSubjectTeacher.count({ where: { classId } }),
  ]);

  const blockers: string[] = [];
  if (students > 0) blockers.push(`${students} student${students === 1 ? "" : "s"}`);
  if (exams > 0) blockers.push(`${exams} exam${exams === 1 ? "" : "s"}`);
  if (homework > 0) blockers.push(`${homework} homework item${homework === 1 ? "" : "s"}`);
  if (timetableSlots > 0) blockers.push(`${timetableSlots} timetable slot${timetableSlots === 1 ? "" : "s"}`);
  if (feeStructures > 0) blockers.push(`${feeStructures} fee structure${feeStructures === 1 ? "" : "s"}`);
  if (subjectTeachers > 0) blockers.push(`${subjectTeachers} subject mapping${subjectTeachers === 1 ? "" : "s"}`);

  if (blockers.length > 0) {
    return { error: `Cannot delete — this class still has ${blockers.join(", ")}.` };
  }

  await sdb.class.delete({ where: { id: classId } });
  revalidatePath("/app/institute");
  return {};
}

export async function createSubject(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const sdb = await getScopedDb();

  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) return { error: "Subject name is required." };
  const nameTrim = name.trim();

  const existing = await sdb.subject.findFirst({ where: { name: { equals: nameTrim, mode: "insensitive" } } });
  if (existing) return { error: `${nameTrim} already exists.` };

  const currentYear = await sdb.academicYear.findFirst({ where: { isCurrent: true } });
  const classes = currentYear ? await sdb.class.findMany({ where: { yearId: currentYear.id } }) : [];

  const subject = await sdb.subject.create({ data: scopedCreateData<Prisma.SubjectUncheckedCreateInput>({ name: nameTrim }) });

  const assignments = classes
    .map((c) => ({ classId: c.id, staffId: formData.get(`teacher_${c.id}`) }))
    .filter((a): a is { classId: string; staffId: string } => typeof a.staffId === "string" && a.staffId.length > 0);

  if (assignments.length > 0) {
    await sdb.classSubjectTeacher.createMany({
      data: assignments.map((a) => scopedCreateData<Prisma.ClassSubjectTeacherUncheckedCreateInput>({ classId: a.classId, subjectId: subject.id, staffId: a.staffId })),
    });
  }

  revalidatePath("/app/institute");
  return { success: true };
}

export async function deleteSubject(subjectId: string): Promise<{ error?: string }> {
  await requireAdmin();
  const sdb = await getScopedDb();

  const [timetableSlots, examSubjects, homework, classAssignments] = await Promise.all([
    sdb.timetableSlot.count({ where: { subjectId } }),
    sdb.examSubject.count({ where: { subjectId } }),
    sdb.homework.count({ where: { subjectId } }),
    sdb.classSubjectTeacher.count({ where: { subjectId } }),
  ]);

  if (timetableSlots + examSubjects + homework + classAssignments > 0) {
    return { error: "This subject is in use (timetable, exams, homework, or class mapping) — remove those first." };
  }

  await sdb.subject.delete({ where: { id: subjectId } });
  revalidatePath("/app/institute");
  return {};
}

export async function setClassSubjectTeacher(classId: string, subjectId: string, staffId: string | null) {
  await requireAdmin();
  const sdb = await getScopedDb();

  if (!staffId) {
    await sdb.classSubjectTeacher.deleteMany({ where: { classId, subjectId } });
  } else {
    await sdb.classSubjectTeacher.upsert({
      where: { classId_subjectId: { classId, subjectId } },
      update: { staffId },
      create: scopedCreateData<Prisma.ClassSubjectTeacherUncheckedCreateInput>({ classId, subjectId, staffId }),
    });
  }

  revalidatePath("/app/institute");
}

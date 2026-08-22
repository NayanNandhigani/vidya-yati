"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getScopedDb, scopedCreateData } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";

export type ExamFormState = { error?: string };

export async function createExam(_prevState: ExamFormState, formData: FormData): Promise<ExamFormState> {
  await requireModuleAccess("Exams", "EDIT");
  const sdb = await getScopedDb();

  const name = formData.get("name");
  const classId = formData.get("classId");
  const startDate = formData.get("startDate");
  const endDate = formData.get("endDate");
  const subjectIds = formData.getAll("subjectIds") as string[];

  if (
    typeof name !== "string" || !name.trim() ||
    typeof classId !== "string" || !classId ||
    typeof startDate !== "string" || !startDate ||
    typeof endDate !== "string" || !endDate ||
    subjectIds.length === 0
  ) {
    return { error: "Name, class, dates, and at least one subject are required." };
  }

  const cls = await sdb.class.findUniqueOrThrow({ where: { id: classId } });

  const exam = await sdb.exam.create({
    data: scopedCreateData<Prisma.ExamUncheckedCreateInput>({
      name: name.trim(),
      classId,
      yearId: cls.yearId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    }),
  });

  await sdb.examSubject.createMany({
    data: subjectIds.map((subjectId) =>
      scopedCreateData<Prisma.ExamSubjectUncheckedCreateInput>({
        examId: exam.id,
        subjectId,
        maxMarks: Number(formData.get(`maxMarks_${subjectId}`)) || 100,
      })
    ),
  });

  revalidatePath("/app/exams");
  redirect(`/app/exams?exam=${exam.id}&classId=${classId}`);
}

export async function saveMarks(examId: string, marks: Record<string, Record<string, number>>) {
  await requireModuleAccess("Exams", "EDIT");
  const sdb = await getScopedDb();

  const ops = [];
  for (const [studentId, bySubject] of Object.entries(marks)) {
    for (const [examSubjectId, marksObtained] of Object.entries(bySubject)) {
      ops.push(
        sdb.mark.upsert({
          where: { examSubjectId_studentId: { examSubjectId, studentId } },
          update: { marksObtained },
          create: scopedCreateData<Prisma.MarkUncheckedCreateInput>({ examSubjectId, studentId, marksObtained }),
        })
      );
    }
  }

  if (ops.length > 0) await sdb.$transaction(ops);
  revalidatePath("/app/exams");
  return { success: true };
}

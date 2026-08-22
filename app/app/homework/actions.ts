"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma, SubmissionStatus } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getScopedDb, scopedCreateData } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";

export type HomeworkFormState = { error?: string };

export async function createHomework(_prevState: HomeworkFormState, formData: FormData): Promise<HomeworkFormState> {
  await requireModuleAccess("Homework", "EDIT");
  const session = await auth();
  const sdb = await getScopedDb();

  const title = formData.get("title");
  const description = formData.get("description");
  const classId = formData.get("classId");
  const subjectId = formData.get("subjectId");
  const dueDate = formData.get("dueDate");

  if (
    typeof title !== "string" || !title.trim() ||
    typeof classId !== "string" || !classId ||
    typeof subjectId !== "string" || !subjectId ||
    typeof dueDate !== "string" || !dueDate
  ) {
    return { error: "Title, class, subject, and due date are required." };
  }

  const staffProfile =
    session!.user.role === "STAFF" ? await db.staffProfile.findUnique({ where: { userId: session!.user.id } }) : null;

  if (session!.user.role === "STAFF" && !staffProfile) {
    return { error: "Staff profile not found." };
  }

  // School Admins assigning homework directly need a staff record to attribute
  // it to; fall back to the class's own class teacher if the admin has none.
  let staffId = staffProfile?.id;
  if (!staffId) {
    const cls = await sdb.class.findUnique({ where: { id: classId } });
    staffId = cls?.classTeacherStaffId ?? undefined;
  }
  if (!staffId) {
    return { error: "This class has no class teacher assigned to attribute the homework to." };
  }

  const homework = await sdb.homework.create({
    data: scopedCreateData<Prisma.HomeworkUncheckedCreateInput>({
      title: title.trim(),
      description: typeof description === "string" ? description.trim() || null : null,
      classId,
      subjectId,
      staffId,
      dueDate: new Date(dueDate),
    }),
  });

  const students = await sdb.student.findMany({ where: { classId, status: "ACTIVE" }, select: { id: true } });
  if (students.length > 0) {
    await sdb.homeworkSubmission.createMany({
      data: students.map((s) =>
        scopedCreateData<Prisma.HomeworkSubmissionUncheckedCreateInput>({ assignmentId: homework.id, studentId: s.id })
      ),
    });
  }

  revalidatePath("/app/homework");
  redirect(`/app/homework?assignment=${homework.id}`);
}

export async function cycleSubmissionStatus(submissionId: string) {
  await requireModuleAccess("Homework", "EDIT");
  const sdb = await getScopedDb();
  const sub = await sdb.homeworkSubmission.findUniqueOrThrow({ where: { id: submissionId } });

  const cycle: SubmissionStatus[] = ["PENDING", "SUBMITTED", "LATE"];
  const next = cycle[(cycle.indexOf(sub.status) + 1) % cycle.length];

  await sdb.homeworkSubmission.update({
    where: { id: submissionId },
    data: { status: next, submittedOn: next === "PENDING" ? null : (sub.submittedOn ?? new Date()) },
  });

  revalidatePath("/app/homework");
  return { status: next };
}

export async function setSubmissionScore(submissionId: string, score: number) {
  await requireModuleAccess("Homework", "EDIT");
  const sdb = await getScopedDb();
  await sdb.homeworkSubmission.update({ where: { id: submissionId }, data: { score } });
  revalidatePath("/app/homework");
}

export async function remindPending(assignmentId: string) {
  await requireModuleAccess("Homework", "EDIT");
  const sdb = await getScopedDb();

  const homework = await sdb.homework.findUniqueOrThrow({ where: { id: assignmentId } });
  const pending = await sdb.homeworkSubmission.findMany({ where: { assignmentId, status: "PENDING" } });

  if (pending.length === 0) return { remindedCount: 0 };

  await sdb.announcement.createMany({
    data: pending.map((p) =>
      scopedCreateData<Prisma.AnnouncementUncheckedCreateInput>({
        title: "Homework reminder",
        body: `"${homework.title}" is due ${homework.dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} and hasn't been submitted yet.`,
        audienceType: "SPECIFIC_STUDENT",
        audienceTarget: p.studentId,
        publishedOn: new Date(),
      })
    ),
  });

  revalidatePath("/app/homework");
  return { remindedCount: pending.length };
}

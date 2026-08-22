"use server";

import { revalidatePath } from "next/cache";
import { Prisma, AudienceType } from "@prisma/client";
import { getScopedDb, scopedCreateData } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";

export type AnnouncementFormState = { error?: string; success?: boolean };

export async function publishAnnouncement(_prevState: AnnouncementFormState, formData: FormData): Promise<AnnouncementFormState> {
  await requireModuleAccess("Communication", "EDIT");
  const sdb = await getScopedDb();

  const title = formData.get("title");
  const body = formData.get("body");
  const audienceType = formData.get("audienceType");
  const audienceTarget = formData.get("audienceTarget");
  const scheduleDate = formData.get("scheduleDate");

  if (typeof title !== "string" || !title.trim() || typeof body !== "string" || !body.trim() || typeof audienceType !== "string") {
    return { error: "Title, message, and audience are required." };
  }
  if ((audienceType === "SPECIFIC_CLASS" || audienceType === "SPECIFIC_STUDENT") && (typeof audienceTarget !== "string" || !audienceTarget)) {
    return { error: "Select the target for this audience." };
  }

  const scheduled = typeof scheduleDate === "string" && scheduleDate ? new Date(scheduleDate) : null;
  const isFuture = scheduled && scheduled.getTime() > Date.now();

  await sdb.announcement.create({
    data: scopedCreateData<Prisma.AnnouncementUncheckedCreateInput>({
      title: title.trim(),
      body: body.trim(),
      audienceType: audienceType as AudienceType,
      audienceTarget: typeof audienceTarget === "string" && audienceTarget ? audienceTarget : null,
      publishedOn: isFuture ? null : new Date(),
      scheduledFor: isFuture ? scheduled : null,
    }),
  });

  revalidatePath("/app/communication");
  return { success: true };
}

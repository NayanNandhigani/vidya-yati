"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getScopedDb, scopedCreateData } from "@/lib/tenant-db";
import { ID_CARD_LAYOUTS } from "./id-card-layouts";

async function requireAdmin() {
  const session = await auth();
  if (session!.user.role !== "SCHOOL_ADMIN") throw new Error("Only a School Admin can change settings.");
}

export type FormState = { error?: string; success?: boolean };

export async function saveGeneral(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const session = await auth();

  const name = formData.get("name");
  const city = formData.get("city");
  const state = formData.get("state");

  if (typeof name !== "string" || !name.trim()) return { error: "School name is required." };

  await db.school.update({
    where: { id: session!.user.schoolId! },
    data: { name: name.trim(), city: typeof city === "string" ? city : null, state: typeof state === "string" ? state : null },
  });

  revalidatePath("/app/settings");
  revalidatePath("/app/dashboard");
  return { success: true };
}

export async function createAcademicYear(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const sdb = await getScopedDb();

  const label = formData.get("label");
  const startDate = formData.get("startDate");
  const endDate = formData.get("endDate");

  if (typeof label !== "string" || !label.trim() || typeof startDate !== "string" || !startDate || typeof endDate !== "string" || !endDate) {
    return { error: "Label and both dates are required." };
  }

  await sdb.academicYear.create({
    data: scopedCreateData<Prisma.AcademicYearUncheckedCreateInput>({
      label: label.trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isCurrent: false,
    }),
  });

  revalidatePath("/app/settings");
  redirect("/app/settings?panel=years");
}

export async function setCurrentYear(yearId: string) {
  await requireAdmin();
  const sdb = await getScopedDb();
  await sdb.$transaction([
    sdb.academicYear.updateMany({ data: { isCurrent: false }, where: {} }),
    sdb.academicYear.update({ where: { id: yearId }, data: { isCurrent: true } }),
  ]);
  revalidatePath("/app/settings");
  revalidatePath("/app/dashboard");
}

export async function saveWebsiteSettings(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const session = await auth();
  const sdb = await getScopedDb();

  const tagline = formData.get("tagline");
  const themeColor = formData.get("themeColor");
  const sections = ["hero", "about", "admissionsCta", "faculty", "gallery", "contact"];
  const sectionVisibility = Object.fromEntries(sections.map((s) => [s, formData.get(`section_${s}`) === "on"]));

  await sdb.websiteSettings.upsert({
    where: { schoolId: session!.user.schoolId! },
    update: { tagline: typeof tagline === "string" ? tagline : null, themeColor: typeof themeColor === "string" ? themeColor : null, sectionVisibility },
    create: scopedCreateData<Prisma.WebsiteSettingsUncheckedCreateInput>({
      tagline: typeof tagline === "string" ? tagline : null,
      themeColor: typeof themeColor === "string" ? themeColor : null,
      sectionVisibility,
    }),
  });

  revalidatePath("/app/settings");
  return { success: true };
}

export async function selectIdCardTemplate(layoutKey: string) {
  await requireAdmin();
  const sdb = await getScopedDb();

  const layout = ID_CARD_LAYOUTS.find((l) => l.key === layoutKey);
  if (!layout) throw new Error("Unknown layout.");

  const existing = await sdb.idCardTemplate.findFirst();
  if (existing) {
    await sdb.idCardTemplate.update({ where: { id: existing.id }, data: { layoutConfig: layout } });
  } else {
    await sdb.idCardTemplate.create({ data: scopedCreateData<Prisma.IdCardTemplateUncheckedCreateInput>({ layoutConfig: layout }) });
  }

  revalidatePath("/app/settings");
}

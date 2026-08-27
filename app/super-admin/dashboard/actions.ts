"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/auth";

async function assertSuperAdmin() {
  const session = await auth();
  if (session?.user.role !== "SUPER_ADMIN") throw new Error("Only a Super Admin can do this.");
}

function revalidateAll() {
  revalidatePath("/super-admin/dashboard");
  revalidatePath("/super-admin/schools");
}

// One-click CRM action: there's no email/SMS provider wired up yet (see
// CLAUDE.md — messaging integrations are deferred), so "send reminder"
// genuinely logs a real, dated contact touch on the school rather than
// pretending to dispatch a message that can't actually be sent.
export async function logReminder(schoolId: string) {
  await assertSuperAdmin();
  await db.school.update({ where: { id: schoolId }, data: { lastContactedAt: new Date() } });
  revalidateAll();
}

export async function markLost(schoolId: string) {
  await assertSuperAdmin();
  await db.school.update({ where: { id: schoolId }, data: { status: "CANCELLED" } });
  revalidateAll();
}

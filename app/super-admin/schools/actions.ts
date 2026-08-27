"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import type { SchoolPlan, SchoolStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export type SchoolFormState = { error?: string };
export type ManageFormState = { error?: string; success?: boolean };

const DEFAULT_PASSWORD = "12345";
const VALID_PLANS: SchoolPlan[] = ["STANDARD", "PREMIUM"];
const VALID_STATUSES: SchoolStatus[] = ["TRIAL", "ACTIVE", "EXPIRING", "OVERDUE", "CANCELLED"];

async function generateSchoolCode(name: string): Promise<string> {
  const initials =
    name
      .replace(/[^a-zA-Z ]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 4) || "SCH";

  for (let attempt = 0; attempt < 8; attempt++) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const code = `${initials}${suffix}`;
    const existing = await db.school.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique school code.");
}

export async function onboardSchool(_prevState: SchoolFormState, formData: FormData): Promise<SchoolFormState> {
  const name = formData.get("name");
  const city = formData.get("city");
  const state = formData.get("state");
  const plan = formData.get("plan");
  const adminName = formData.get("adminName");
  const adminUsername = formData.get("adminUsername");

  if (
    typeof name !== "string" || !name.trim() ||
    typeof adminName !== "string" || !adminName.trim() ||
    typeof adminUsername !== "string" || !adminUsername.trim()
  ) {
    return { error: "School name, admin name, and admin username are required." };
  }

  const username = adminUsername.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { username } });
  if (existing) return { error: "A user with this username already exists." };

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const code = await generateSchoolCode(name.trim());

  const school = await db.school.create({
    data: {
      code,
      name: name.trim(),
      city: typeof city === "string" && city ? city : null,
      state: typeof state === "string" && state ? state : null,
      plan: plan === "PREMIUM" ? "PREMIUM" : "STANDARD",
      status: "TRIAL",
      users: {
        create: {
          name: adminName.trim(),
          username,
          passwordHash,
          role: "SCHOOL_ADMIN",
        },
      },
    },
  });

  revalidatePath("/super-admin/schools");
  redirect(`/super-admin/schools?school=${school.id}`);
}

export async function updateSchool(_prevState: ManageFormState, formData: FormData): Promise<ManageFormState> {
  const session = await auth();
  if (session?.user.role !== "SUPER_ADMIN") return { error: "Only a Super Admin can manage schools." };

  const id = formData.get("id");
  const name = formData.get("name");
  const code = formData.get("code");
  const city = formData.get("city");
  const state = formData.get("state");
  const plan = formData.get("plan");
  const status = formData.get("status");

  if (typeof id !== "string" || !id) return { error: "Missing school." };
  if (typeof name !== "string" || !name.trim()) return { error: "School name is required." };
  if (typeof code !== "string" || !code.trim()) return { error: "School code is required." };

  const normalizedCode = code.trim().toUpperCase();
  const codeOwner = await db.school.findUnique({ where: { code: normalizedCode } });
  if (codeOwner && codeOwner.id !== id) return { error: "Another school already uses this code." };

  await db.school.update({
    where: { id },
    data: {
      name: name.trim(),
      code: normalizedCode,
      city: typeof city === "string" && city.trim() ? city.trim() : null,
      state: typeof state === "string" && state.trim() ? state.trim() : null,
      plan: VALID_PLANS.includes(plan as SchoolPlan) ? (plan as SchoolPlan) : undefined,
      status: VALID_STATUSES.includes(status as SchoolStatus) ? (status as SchoolStatus) : undefined,
    },
  });

  revalidatePath("/super-admin/schools");
  return { success: true };
}

export async function updateRelationshipManager(_prevState: ManageFormState, formData: FormData): Promise<ManageFormState> {
  const session = await auth();
  if (session?.user.role !== "SUPER_ADMIN") return { error: "Only a Super Admin can manage schools." };

  const id = formData.get("id");
  const relationshipManager = formData.get("relationshipManager");
  if (typeof id !== "string" || !id) return { error: "Missing school." };

  await db.school.update({
    where: { id },
    data: { relationshipManager: typeof relationshipManager === "string" && relationshipManager.trim() ? relationshipManager.trim() : null },
  });

  revalidatePath("/super-admin/schools");
  return { success: true };
}

export async function addSchoolNote(_prevState: ManageFormState, formData: FormData): Promise<ManageFormState> {
  const session = await auth();
  if (session?.user.role !== "SUPER_ADMIN") return { error: "Only a Super Admin can add notes." };

  const id = formData.get("id");
  const body = formData.get("body");
  if (typeof id !== "string" || !id) return { error: "Missing school." };
  if (typeof body !== "string" || !body.trim()) return { error: "Note can't be empty." };

  await db.schoolNote.create({
    data: { schoolId: id, authorId: session.user.id, body: body.trim() },
  });

  revalidatePath("/super-admin/schools");
  return { success: true };
}

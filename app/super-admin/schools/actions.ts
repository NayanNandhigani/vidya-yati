"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export type SchoolFormState = { error?: string };

export async function onboardSchool(_prevState: SchoolFormState, formData: FormData): Promise<SchoolFormState> {
  const name = formData.get("name");
  const city = formData.get("city");
  const state = formData.get("state");
  const plan = formData.get("plan");
  const adminName = formData.get("adminName");
  const adminEmail = formData.get("adminEmail");
  const adminPassword = formData.get("adminPassword");

  if (
    typeof name !== "string" || !name.trim() ||
    typeof adminName !== "string" || !adminName.trim() ||
    typeof adminEmail !== "string" || !adminEmail.trim() ||
    typeof adminPassword !== "string" || adminPassword.length < 8
  ) {
    return { error: "School name, admin name/email, and a password of at least 8 characters are required." };
  }

  const existing = await db.user.findUnique({ where: { email: adminEmail.toLowerCase().trim() } });
  if (existing) return { error: "A user with this admin email already exists." };

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const school = await db.school.create({
    data: {
      name: name.trim(),
      city: typeof city === "string" && city ? city : null,
      state: typeof state === "string" && state ? state : null,
      plan: plan === "PREMIUM" ? "PREMIUM" : "STANDARD",
      status: "TRIAL",
      users: {
        create: {
          name: adminName.trim(),
          email: adminEmail.toLowerCase().trim(),
          passwordHash,
          role: "SCHOOL_ADMIN",
        },
      },
    },
  });

  revalidatePath("/super-admin/schools");
  redirect(`/super-admin/schools?school=${school.id}`);
}

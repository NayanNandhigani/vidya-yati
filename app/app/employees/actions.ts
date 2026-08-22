"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Prisma, AccessLevel } from "@prisma/client";
import { db } from "@/lib/db";
import { getScopedDb, scopedCreateData } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";
import { auth } from "@/auth";

export type StaffFormState = { error?: string };

export async function createStaff(_prevState: StaffFormState, formData: FormData): Promise<StaffFormState> {
  const session = await auth();
  if (session!.user.role !== "SCHOOL_ADMIN") return { error: "Only a School Admin can add staff." };
  const sdb = await getScopedDb();

  const name = formData.get("name");
  const email = formData.get("email");
  const phone = formData.get("phone");
  const password = formData.get("password");
  const designation = formData.get("designation");
  const department = formData.get("department");

  if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !email.trim() || typeof password !== "string" || password.length < 8) {
    return { error: "Name, email, and a password of at least 8 characters are required." };
  }

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return { error: "A user with this email already exists." };

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await sdb.user.create({
    data: scopedCreateData<Prisma.UserUncheckedCreateInput>({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: typeof phone === "string" && phone ? phone : null,
      role: "STAFF",
      passwordHash,
    }),
  });

  const staff = await sdb.staffProfile.create({
    data: scopedCreateData<Prisma.StaffProfileUncheckedCreateInput>({
      userId: user.id,
      designation: typeof designation === "string" && designation ? designation : null,
      department: typeof department === "string" && department ? department : null,
      dateJoined: new Date(),
    }),
  });

  revalidatePath("/app/employees");
  redirect(`/app/employees?staff=${staff.id}`);
}

export async function cyclePermission(staffId: string, moduleName: string) {
  const session = await auth();
  if (session!.user.role !== "SCHOOL_ADMIN") throw new Error("Only a School Admin can change permissions.");
  const sdb = await getScopedDb();

  const CYCLE: AccessLevel[] = ["NONE", "VIEW", "EDIT", "FULL"];
  const existing = await sdb.staffPermission.findUnique({ where: { staffId_moduleName: { staffId, moduleName } } });
  const next = CYCLE[(CYCLE.indexOf(existing?.accessLevel ?? "NONE") + 1) % CYCLE.length];

  await sdb.staffPermission.upsert({
    where: { staffId_moduleName: { staffId, moduleName } },
    update: { accessLevel: next },
    create: scopedCreateData<Prisma.StaffPermissionUncheckedCreateInput>({ staffId, moduleName, accessLevel: next }),
  });

  revalidatePath("/app/employees");
  return { accessLevel: next };
}

export async function runPayroll(staffId: string, month: string, amount: number) {
  await requireModuleAccess("Employees", "EDIT");
  const sdb = await getScopedDb();

  const staff = await sdb.staffProfile.findUniqueOrThrow({ where: { id: staffId }, include: { user: true } });

  const run = await sdb.payrollRun.upsert({
    where: { staffId_month: { staffId, month } },
    update: { amount, status: "PAID", paidOn: new Date() },
    create: scopedCreateData<Prisma.PayrollRunUncheckedCreateInput>({ staffId, month, amount, status: "PAID", paidOn: new Date() }),
  });

  await sdb.accountsTransaction.create({
    data: scopedCreateData<Prisma.AccountsTransactionUncheckedCreateInput>({
      date: new Date(),
      description: `Staff salary — ${staff.user.name} (${month})`,
      category: "Payroll",
      source: "AUTO_PAYROLL",
      type: "EXPENSE",
      amount,
    }),
  });

  revalidatePath("/app/employees");
  revalidatePath("/app/accounts");
  revalidatePath("/app/dashboard");
  return { runId: run.id };
}

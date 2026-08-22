"use server";

import { revalidatePath } from "next/cache";
import { Prisma, TxnType } from "@prisma/client";
import { getScopedDb, scopedCreateData } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";

export type TransactionFormState = { error?: string; success?: boolean };

export async function addTransaction(_prevState: TransactionFormState, formData: FormData): Promise<TransactionFormState> {
  await requireModuleAccess("Accounts", "EDIT");
  const sdb = await getScopedDb();

  const type = formData.get("type");
  const date = formData.get("date");
  const description = formData.get("description");
  const category = formData.get("category");
  const amountRaw = formData.get("amount");

  if (
    (type !== "INCOME" && type !== "EXPENSE") ||
    typeof date !== "string" || !date ||
    typeof description !== "string" || !description.trim() ||
    typeof amountRaw !== "string" || !amountRaw
  ) {
    return { error: "All fields are required." };
  }
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid amount." };
  }

  await sdb.accountsTransaction.create({
    data: scopedCreateData<Prisma.AccountsTransactionUncheckedCreateInput>({
      date: new Date(date),
      description: description.trim(),
      category: typeof category === "string" ? category : null,
      source: "MANUAL",
      type: type as TxnType,
      amount,
    }),
  });

  revalidatePath("/app/accounts");
  revalidatePath("/app/dashboard");
  return { success: true };
}

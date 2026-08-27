"use server";

import { revalidatePath } from "next/cache";
import type { LedgerAccountType, Recurrence } from "@prisma/client";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export type AccountsFormState = { error?: string; success?: boolean };

const VALID_ACCOUNT_TYPES: LedgerAccountType[] = ["INCOME", "EXPENSE", "ASSET", "LIABILITY"];
const VALID_RECURRENCE: Recurrence[] = ["NONE", "MONTHLY", "QUARTERLY", "YEARLY"];

function revalidateAccounts() {
  revalidatePath("/super-admin/accounts");
  revalidatePath("/super-admin/dashboard");
}

async function assertSuperAdmin() {
  const session = await auth();
  if (session?.user.role !== "SUPER_ADMIN") throw new Error("Only a Super Admin can manage accounts.");
}

// --- Chart of accounts -----------------------------------------------------

export async function createLedgerAccount(_prevState: AccountsFormState, formData: FormData): Promise<AccountsFormState> {
  const session = await auth();
  if (session?.user.role !== "SUPER_ADMIN") return { error: "Only a Super Admin can manage accounts." };

  const name = formData.get("name");
  const type = formData.get("type");
  const code = formData.get("code");

  if (typeof name !== "string" || !name.trim()) return { error: "Account name is required." };
  if (typeof type !== "string" || !VALID_ACCOUNT_TYPES.includes(type as LedgerAccountType)) return { error: "Choose a valid account type." };

  const existing = await db.ledgerAccount.findUnique({ where: { name: name.trim() } });
  if (existing) return { error: "An account with this name already exists." };

  await db.ledgerAccount.create({
    data: { name: name.trim(), type: type as LedgerAccountType, code: typeof code === "string" && code.trim() ? code.trim() : null },
  });

  revalidateAccounts();
  return { success: true };
}

// --- Vendors -----------------------------------------------------------------

export async function createVendor(_prevState: AccountsFormState, formData: FormData): Promise<AccountsFormState> {
  const session = await auth();
  if (session?.user.role !== "SUPER_ADMIN") return { error: "Only a Super Admin can manage accounts." };

  const name = formData.get("name");
  const category = formData.get("category");
  const contactName = formData.get("contactName");
  const phone = formData.get("phone");
  const email = formData.get("email");
  const notes = formData.get("notes");

  if (typeof name !== "string" || !name.trim()) return { error: "Vendor name is required." };

  await db.vendor.create({
    data: {
      name: name.trim(),
      category: typeof category === "string" && category.trim() ? category.trim() : null,
      contactName: typeof contactName === "string" && contactName.trim() ? contactName.trim() : null,
      phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
      email: typeof email === "string" && email.trim() ? email.trim() : null,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
    },
  });

  revalidateAccounts();
  return { success: true };
}

// --- Bills (accounts payable) -------------------------------------------------

export async function createBill(_prevState: AccountsFormState, formData: FormData): Promise<AccountsFormState> {
  const session = await auth();
  if (session?.user.role !== "SUPER_ADMIN") return { error: "Only a Super Admin can manage accounts." };

  const vendorId = formData.get("vendorId");
  const ledgerAccountId = formData.get("ledgerAccountId");
  const billNumberRaw = formData.get("billNumber");
  const amountRaw = formData.get("amount");
  const issueDateRaw = formData.get("issueDate");
  const dueDateRaw = formData.get("dueDate");
  const recurrence = formData.get("recurrence");
  const notes = formData.get("notes");

  if (typeof vendorId !== "string" || !vendorId) return { error: "Choose a vendor." };
  if (typeof ledgerAccountId !== "string" || !ledgerAccountId) return { error: "Choose an expense category." };
  if (typeof amountRaw !== "string" || !amountRaw) return { error: "Enter an amount." };
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter a valid amount." };
  if (typeof dueDateRaw !== "string" || !dueDateRaw) return { error: "Enter a due date." };

  const billNumber = typeof billNumberRaw === "string" && billNumberRaw.trim() ? billNumberRaw.trim() : `BILL-${Date.now().toString(36).toUpperCase()}`;
  const issueDate = typeof issueDateRaw === "string" && issueDateRaw ? new Date(issueDateRaw) : new Date();

  await db.bill.create({
    data: {
      vendorId,
      ledgerAccountId,
      billNumber,
      amount,
      issueDate,
      dueDate: new Date(dueDateRaw),
      recurrence: typeof recurrence === "string" && VALID_RECURRENCE.includes(recurrence as Recurrence) ? (recurrence as Recurrence) : "NONE",
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
    },
  });

  revalidateAccounts();
  return { success: true };
}

export async function recordBillPayment(_prevState: AccountsFormState, formData: FormData): Promise<AccountsFormState> {
  const session = await auth();
  if (session?.user.role !== "SUPER_ADMIN") return { error: "Only a Super Admin can manage accounts." };

  const billId = formData.get("billId");
  const amountRaw = formData.get("amount");
  const method = formData.get("method");
  const paidOnRaw = formData.get("paidOn");
  const referenceNo = formData.get("referenceNo");

  if (typeof billId !== "string" || !billId) return { error: "Missing bill." };
  if (typeof amountRaw !== "string" || !amountRaw) return { error: "Enter an amount." };
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter a valid amount." };
  if (typeof method !== "string" || !method.trim()) return { error: "Enter a payment method." };

  const bill = await db.bill.findUniqueOrThrow({ where: { id: billId }, include: { payments: true } });
  const paidOn = typeof paidOnRaw === "string" && paidOnRaw ? new Date(paidOnRaw) : new Date();
  const alreadyPaid = bill.payments.reduce((s, p) => s + Number(p.amount), 0);
  const newStatus = alreadyPaid + amount >= Number(bill.amount) ? "PAID" : "PARTIALLY_PAID";

  await db.$transaction([
    db.ledgerEntry.create({
      data: {
        entryType: "EXPENSE",
        ledgerAccountId: bill.ledgerAccountId,
        amount,
        date: paidOn,
        description: `Bill payment — ${bill.billNumber}`,
        method: method.trim(),
        referenceNo: typeof referenceNo === "string" && referenceNo.trim() ? referenceNo.trim() : null,
        source: "MANUAL",
        vendorId: bill.vendorId,
        billId: bill.id,
      },
    }),
    db.bill.update({ where: { id: billId }, data: { status: newStatus } }),
  ]);

  revalidateAccounts();
  return { success: true };
}

// --- General ledger: standalone inbound / outbound entries -------------------

export async function recordInboundPayment(_prevState: AccountsFormState, formData: FormData): Promise<AccountsFormState> {
  const session = await auth();
  if (session?.user.role !== "SUPER_ADMIN") return { error: "Only a Super Admin can manage accounts." };
  return recordStandaloneEntry(formData, "INCOME");
}

export async function recordOutboundPayment(_prevState: AccountsFormState, formData: FormData): Promise<AccountsFormState> {
  const session = await auth();
  if (session?.user.role !== "SUPER_ADMIN") return { error: "Only a Super Admin can manage accounts." };
  return recordStandaloneEntry(formData, "EXPENSE");
}

async function recordStandaloneEntry(formData: FormData, entryType: "INCOME" | "EXPENSE"): Promise<AccountsFormState> {
  const ledgerAccountId = formData.get("ledgerAccountId");
  const vendorId = formData.get("vendorId");
  const amountRaw = formData.get("amount");
  const date = formData.get("date");
  const description = formData.get("description");
  const method = formData.get("method");
  const referenceNo = formData.get("referenceNo");

  if (typeof ledgerAccountId !== "string" || !ledgerAccountId) return { error: "Choose a category." };
  if (typeof amountRaw !== "string" || !amountRaw) return { error: "Enter an amount." };
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter a valid amount." };
  if (typeof description !== "string" || !description.trim()) return { error: "Enter a description." };

  await db.ledgerEntry.create({
    data: {
      entryType,
      ledgerAccountId,
      amount,
      date: typeof date === "string" && date ? new Date(date) : new Date(),
      description: description.trim(),
      method: typeof method === "string" && method.trim() ? method.trim() : null,
      referenceNo: typeof referenceNo === "string" && referenceNo.trim() ? referenceNo.trim() : null,
      source: "MANUAL",
      vendorId: typeof vendorId === "string" && vendorId ? vendorId : null,
    },
  });

  revalidateAccounts();
  return { success: true };
}

// --- Scheduled (recurring) invoices ------------------------------------------

export async function setInvoiceRecurrence(invoiceId: string, recurrence: Recurrence) {
  await assertSuperAdmin();
  await db.subscriptionInvoice.update({ where: { id: invoiceId }, data: { recurrence } });
  revalidateAccounts();
  revalidatePath("/super-admin/subscriptions");
}

function nextBillingPeriodLabel(recurrence: Recurrence, dueDate: Date): string {
  if (recurrence === "MONTHLY") return dueDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  if (recurrence === "QUARTERLY") return `Q${Math.floor(dueDate.getMonth() / 3) + 1} ${dueDate.getFullYear()}`;
  const fyStartYear = dueDate.getMonth() >= 3 ? dueDate.getFullYear() : dueDate.getFullYear() - 1;
  return `${fyStartYear}–${String(fyStartYear + 1).slice(2)}`;
}

export async function generateNextInvoice(invoiceId: string) {
  await assertSuperAdmin();

  const invoice = await db.subscriptionInvoice.findUniqueOrThrow({ where: { id: invoiceId } });
  if (invoice.recurrence === "NONE") throw new Error("This invoice isn't set to recur.");

  const next = new Date(invoice.dueDate);
  if (invoice.recurrence === "MONTHLY") next.setMonth(next.getMonth() + 1);
  else if (invoice.recurrence === "QUARTERLY") next.setMonth(next.getMonth() + 3);
  else if (invoice.recurrence === "YEARLY") next.setFullYear(next.getFullYear() + 1);

  const created = await db.subscriptionInvoice.create({
    data: {
      schoolId: invoice.schoolId,
      amount: invoice.amount,
      billingPeriod: nextBillingPeriodLabel(invoice.recurrence, next),
      dueDate: next,
      status: "PENDING",
      recurrence: invoice.recurrence,
    },
  });

  revalidateAccounts();
  revalidatePath("/super-admin/subscriptions");
  return { id: created.id };
}

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export type PaymentFormState = { error?: string; success?: boolean };

export async function recordSubscriptionPayment(_prevState: PaymentFormState, formData: FormData): Promise<PaymentFormState> {
  const invoiceId = formData.get("invoiceId");
  const amountRaw = formData.get("amount");
  const method = formData.get("method");
  const paidOnRaw = formData.get("paidOn");
  const referenceNo = formData.get("referenceNo");

  if (typeof invoiceId !== "string" || !invoiceId || typeof amountRaw !== "string" || !amountRaw || typeof method !== "string" || !method) {
    return { error: "Amount and method are required." };
  }
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter a valid amount." };

  const invoice = await db.subscriptionInvoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { payments: true } });
  const paidOn = typeof paidOnRaw === "string" && paidOnRaw ? new Date(paidOnRaw) : new Date();

  const alreadyPaid = invoice.payments.reduce((s, p) => s + Number(p.amount), 0);
  const newStatus = alreadyPaid + amount >= Number(invoice.amount) ? "PAID" : "PENDING";

  await db.$transaction([
    db.subscriptionPayment.create({
      data: { invoiceId, amount, method, referenceNo: typeof referenceNo === "string" && referenceNo ? referenceNo : null, paidOn },
    }),
    db.subscriptionInvoice.update({ where: { id: invoiceId }, data: { status: newStatus } }),
    ...(newStatus === "PAID" ? [db.school.update({ where: { id: invoice.schoolId }, data: { status: "ACTIVE" as const } })] : []),
  ]);

  revalidatePath("/super-admin/subscriptions");
  revalidatePath("/super-admin/schools");
  revalidatePath("/super-admin/dashboard");
  return { success: true };
}

export type InvoiceFormState = { error?: string };

export async function createInvoice(_prevState: InvoiceFormState, formData: FormData): Promise<InvoiceFormState> {
  const schoolId = formData.get("schoolId");
  const amountRaw = formData.get("amount");
  const billingPeriod = formData.get("billingPeriod");
  const dueDate = formData.get("dueDate");

  if (typeof schoolId !== "string" || !schoolId || typeof amountRaw !== "string" || !amountRaw || typeof billingPeriod !== "string" || !billingPeriod.trim() || typeof dueDate !== "string" || !dueDate) {
    return { error: "All fields are required." };
  }

  await db.subscriptionInvoice.create({
    data: { schoolId, amount: Number(amountRaw), billingPeriod: billingPeriod.trim(), dueDate: new Date(dueDate), status: "PENDING" },
  });

  revalidatePath("/super-admin/subscriptions");
  return {};
}

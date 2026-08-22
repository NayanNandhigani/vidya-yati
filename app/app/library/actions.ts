"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getScopedDb, scopedCreateData } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";

export type FormState = { error?: string };

export async function createBook(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireModuleAccess("Library", "EDIT");
  const sdb = await getScopedDb();

  const title = formData.get("title");
  const author = formData.get("author");
  const accessionNo = formData.get("accessionNo");
  const category = formData.get("category");
  const copies = formData.get("copies");

  if (typeof title !== "string" || !title.trim() || typeof accessionNo !== "string" || !accessionNo.trim() || typeof copies !== "string" || !copies) {
    return { error: "Title, accession number, and copy count are required." };
  }

  await sdb.libraryBook.create({
    data: scopedCreateData<Prisma.LibraryBookUncheckedCreateInput>({
      title: title.trim(),
      author: typeof author === "string" && author ? author : null,
      accessionNo: accessionNo.trim(),
      category: typeof category === "string" && category ? category : null,
      copiesTotal: Number(copies),
      copiesAvailable: Number(copies),
    }),
  });

  revalidatePath("/app/library");
  redirect("/app/library");
}

export async function issueBook(studentId: string, bookId: string) {
  await requireModuleAccess("Library", "EDIT");
  const sdb = await getScopedDb();

  const book = await sdb.libraryBook.findUniqueOrThrow({ where: { id: bookId } });
  if (book.copiesAvailable <= 0) throw new Error("No copies available.");

  const issueDate = new Date();
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + 14);

  await sdb.$transaction([
    sdb.libraryCirculation.create({
      data: scopedCreateData<Prisma.LibraryCirculationUncheckedCreateInput>({ bookId, studentId, issueDate, dueDate, status: "ISSUED" }),
    }),
    sdb.libraryBook.update({ where: { id: bookId }, data: { copiesAvailable: { decrement: 1 } } }),
  ]);

  revalidatePath("/app/library");
}

export async function returnBook(circulationId: string) {
  await requireModuleAccess("Library", "EDIT");
  const sdb = await getScopedDb();

  const circ = await sdb.libraryCirculation.findUniqueOrThrow({ where: { id: circulationId } });

  await sdb.$transaction([
    sdb.libraryCirculation.update({ where: { id: circulationId }, data: { status: "RETURNED", returnDate: new Date() } }),
    sdb.libraryBook.update({ where: { id: circ.bookId }, data: { copiesAvailable: { increment: 1 } } }),
  ]);

  revalidatePath("/app/library");
}

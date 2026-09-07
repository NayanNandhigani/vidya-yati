"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getScopedDb, scopedCreateData } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";

export type FormState = { error?: string };

export async function createRoom(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireModuleAccess("Hostel", "EDIT");
  const sdb = await getScopedDb();

  const roomNo = formData.get("roomNo");
  const capacity = formData.get("capacity");

  if (typeof roomNo !== "string" || !roomNo.trim() || typeof capacity !== "string" || !capacity) {
    return { error: "Room number and capacity are required." };
  }

  const room = await sdb.hostelRoom.create({
    data: scopedCreateData<Prisma.HostelRoomUncheckedCreateInput>({ roomNo: roomNo.trim(), capacity: Number(capacity) }),
  });

  revalidatePath("/app/hostel");
  redirect(`/app/hostel?room=${room.id}`);
}

export async function allocateRoom(roomId: string, studentId: string) {
  await requireModuleAccess("Hostel", "EDIT");
  const sdb = await getScopedDb();

  const [room, allocatedCount] = await Promise.all([
    sdb.hostelRoom.findUniqueOrThrow({ where: { id: roomId } }),
    sdb.hostelAllocation.count({ where: { roomId } }),
  ]);
  if (allocatedCount >= room.capacity) throw new Error("Room is at full capacity.");

  await sdb.hostelAllocation.create({
    data: scopedCreateData<Prisma.HostelAllocationUncheckedCreateInput>({ roomId, studentId, dateFrom: new Date() }),
  });

  revalidatePath("/app/hostel");
}

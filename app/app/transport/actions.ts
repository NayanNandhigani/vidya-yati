"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getScopedDb, scopedCreateData } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";

export type FormState = { error?: string };

export async function createRoute(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireModuleAccess("Transport", "EDIT");
  const sdb = await getScopedDb();

  const name = formData.get("name");
  const driverName = formData.get("driverName");
  const vehicleNo = formData.get("vehicleNo");
  const capacity = formData.get("capacity");

  if (typeof name !== "string" || !name.trim()) return { error: "Route name is required." };

  const route = await sdb.transportRoute.create({
    data: scopedCreateData<Prisma.TransportRouteUncheckedCreateInput>({
      name: name.trim(),
      driverName: typeof driverName === "string" && driverName ? driverName : null,
      vehicleNo: typeof vehicleNo === "string" && vehicleNo ? vehicleNo : null,
      capacity: typeof capacity === "string" && capacity ? Number(capacity) : null,
    }),
  });

  revalidatePath("/app/transport");
  redirect(`/app/transport?route=${route.id}`);
}

export async function addStop(routeId: string, stopName: string, pickupTime: string) {
  await requireModuleAccess("Transport", "EDIT");
  const sdb = await getScopedDb();
  const count = await sdb.transportStop.count({ where: { routeId } });

  await sdb.transportStop.create({
    data: scopedCreateData<Prisma.TransportStopUncheckedCreateInput>({
      routeId,
      stopName,
      pickupTime: pickupTime ? new Date(`1970-01-01T${pickupTime}:00`) : null,
      sequence: count + 1,
    }),
  });

  revalidatePath("/app/transport");
}

export async function createRoom(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireModuleAccess("Transport", "EDIT");
  const sdb = await getScopedDb();

  const roomNo = formData.get("roomNo");
  const capacity = formData.get("capacity");

  if (typeof roomNo !== "string" || !roomNo.trim() || typeof capacity !== "string" || !capacity) {
    return { error: "Room number and capacity are required." };
  }

  const room = await sdb.hostelRoom.create({
    data: scopedCreateData<Prisma.HostelRoomUncheckedCreateInput>({ roomNo: roomNo.trim(), capacity: Number(capacity) }),
  });

  revalidatePath("/app/transport");
  redirect(`/app/transport?tab=hostel&room=${room.id}`);
}

export async function allocateRoom(roomId: string, studentId: string) {
  await requireModuleAccess("Transport", "EDIT");
  const sdb = await getScopedDb();

  const [room, allocatedCount] = await Promise.all([
    sdb.hostelRoom.findUniqueOrThrow({ where: { id: roomId } }),
    sdb.hostelAllocation.count({ where: { roomId } }),
  ]);
  if (allocatedCount >= room.capacity) throw new Error("Room is at full capacity.");

  await sdb.hostelAllocation.create({
    data: scopedCreateData<Prisma.HostelAllocationUncheckedCreateInput>({ roomId, studentId, dateFrom: new Date() }),
  });

  revalidatePath("/app/transport");
}

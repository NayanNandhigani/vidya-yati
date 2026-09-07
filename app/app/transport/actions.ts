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


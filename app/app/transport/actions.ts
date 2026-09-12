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
  const vehicleId = formData.get("vehicleId");
  const feeAmount = formData.get("feeAmount");

  if (typeof name !== "string" || !name.trim()) return { error: "Route name is required." };

  const route = await sdb.transportRoute.create({
    data: scopedCreateData<Prisma.TransportRouteUncheckedCreateInput>({
      name: name.trim(),
      vehicleId: typeof vehicleId === "string" && vehicleId ? vehicleId : null,
      feeAmount: typeof feeAmount === "string" && feeAmount ? Number(feeAmount) : null,
    }),
  });

  revalidatePath("/app/transport");
  redirect(`/app/transport?tab=routes&route=${route.id}`);
}

export async function updateRouteVehicleAndFee(routeId: string, vehicleId: string | null, feeAmount: number | null) {
  await requireModuleAccess("Transport", "EDIT");
  const sdb = await getScopedDb();
  await sdb.transportRoute.update({ where: { id: routeId }, data: { vehicleId, feeAmount } });
  revalidatePath("/app/transport");
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

// ------------------------------------------------------- Student assignment

/** Assigns (or re-assigns) a student to a route + one of its stops — upserts on studentId, the table's own primary key, since a student can only ever be on one route at a time. Capacity now lives on the route's vehicle, not the route itself. */
export async function assignStudentToRoute(studentId: string, routeId: string, stopId: string) {
  await requireModuleAccess("Transport", "EDIT");
  const sdb = await getScopedDb();

  const route = await sdb.transportRoute.findUniqueOrThrow({ where: { id: routeId }, include: { assignments: true, vehicle: true } });
  const alreadyOnThisRoute = route.assignments.some((a) => a.studentId === studentId);
  const capacity = route.vehicle?.capacity ?? null;
  if (!alreadyOnThisRoute && capacity !== null && route.assignments.length >= capacity) {
    throw new Error(`${route.name} is at full capacity.`);
  }

  await sdb.studentTransportAssignment.upsert({
    where: { studentId },
    update: { routeId, stopId },
    create: scopedCreateData<Prisma.StudentTransportAssignmentUncheckedCreateInput>({ studentId, routeId, stopId }),
  });

  revalidatePath("/app/transport");
}

export async function unassignStudentFromRoute(studentId: string) {
  await requireModuleAccess("Transport", "EDIT");
  const sdb = await getScopedDb();
  await sdb.studentTransportAssignment.delete({ where: { studentId } }).catch(() => {});
  revalidatePath("/app/transport");
}

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getScopedDb } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";
import { requireFeature } from "@/lib/feature-flags";

async function schoolId() {
  const session = await auth();
  return session!.user.schoolId!;
}

export async function updateRouteLocation(routeId: string, lat: number, lng: number) {
  await requireModuleAccess("Transport", "EDIT");
  await requireFeature(await schoolId(), "transport.liveLocation");
  const sdb = await getScopedDb();
  await sdb.transportRoute.update({ where: { id: routeId }, data: { lastKnownLat: lat, lastKnownLng: lng, lastLocationAt: new Date() } });
  revalidatePath("/app/transport");
}

export async function updateRouteCompliance(
  routeId: string,
  driverLicenseNo: string,
  licenseExpiry: string,
  insuranceExpiry: string,
  fitnessExpiry: string,
  feeAmount: number | null
) {
  await requireModuleAccess("Transport", "EDIT");
  await requireFeature(await schoolId(), "transport.complianceAndFees");
  const sdb = await getScopedDb();
  await sdb.transportRoute.update({
    where: { id: routeId },
    data: {
      driverLicenseNo: driverLicenseNo.trim() || null,
      licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
      insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
      fitnessExpiry: fitnessExpiry ? new Date(fitnessExpiry) : null,
      feeAmount,
    },
  });
  revalidatePath("/app/transport");
}

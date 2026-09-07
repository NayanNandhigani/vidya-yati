"use server";

import { revalidatePath } from "next/cache";
import { Prisma, AssetStatus, PurchaseOrderStatus } from "@prisma/client";
import { auth } from "@/auth";
import { getScopedDb, scopedCreateData } from "@/lib/tenant-db";
import { requireModuleAccess } from "@/lib/permissions";
import { requireFeature } from "@/lib/feature-flags";

async function schoolId() {
  const session = await auth();
  return session!.user.schoolId!;
}

async function guard(minimum: "VIEW" | "EDIT" = "EDIT") {
  await requireModuleAccess("Inventory", minimum);
  await requireFeature(await schoolId(), "inventory.module");
}

// ---------------------------------------------------------------- Assets

export async function createAsset(data: {
  name: string;
  category: string | null;
  serialNo: string | null;
  location: string | null;
  purchaseDate: string;
  purchaseCost: number;
  usefulLifeYears: number;
  notes: string | null;
}) {
  await guard();
  const sdb = await getScopedDb();
  await sdb.inventoryAsset.create({
    data: scopedCreateData<Prisma.InventoryAssetUncheckedCreateInput>({
      name: data.name.trim(),
      category: data.category,
      serialNo: data.serialNo,
      location: data.location,
      purchaseDate: new Date(data.purchaseDate),
      purchaseCost: data.purchaseCost,
      usefulLifeYears: data.usefulLifeYears,
      notes: data.notes,
    }),
  });
  revalidatePath("/app/inventory");
}

export async function updateAssetStatus(assetId: string, status: AssetStatus) {
  await guard();
  const sdb = await getScopedDb();
  await sdb.inventoryAsset.update({ where: { id: assetId }, data: { status } });
  revalidatePath("/app/inventory");
}

// ------------------------------------------------------------ Consumables

export async function createConsumable(data: { name: string; category: string | null; unit: string; reorderLevel: number | null }) {
  await guard();
  const sdb = await getScopedDb();
  await sdb.inventoryConsumable.create({
    data: scopedCreateData<Prisma.InventoryConsumableUncheckedCreateInput>({
      name: data.name.trim(),
      category: data.category,
      unit: data.unit.trim(),
      reorderLevel: data.reorderLevel,
      quantityOnHand: 0,
    }),
  });
  revalidatePath("/app/inventory");
}

/** Manual stock adjustment (e.g. a physical recount, or usage not tied to a PO) — writes a movement row and updates the cached running total. */
export async function adjustStock(consumableId: string, type: "IN" | "OUT", quantity: number, note: string | null) {
  await guard();
  if (quantity <= 0) throw new Error("Quantity must be positive.");
  const sdb = await getScopedDb();
  const consumable = await sdb.inventoryConsumable.findUniqueOrThrow({ where: { id: consumableId } });
  if (type === "OUT" && Number(consumable.quantityOnHand) < quantity) {
    throw new Error(`Only ${consumable.quantityOnHand} ${consumable.unit} in stock.`);
  }
  await sdb.$transaction([
    sdb.inventoryStockMovement.create({
      data: scopedCreateData<Prisma.InventoryStockMovementUncheckedCreateInput>({ consumableId, type, quantity, note }),
    }),
    sdb.inventoryConsumable.update({
      where: { id: consumableId },
      data: { quantityOnHand: type === "IN" ? { increment: quantity } : { decrement: quantity } },
    }),
  ]);
  revalidatePath("/app/inventory");
}

// ---------------------------------------------------------------- Vendors

export async function createVendor(data: { name: string; category: string | null; contactName: string | null; phone: string | null; email: string | null }) {
  await guard();
  const sdb = await getScopedDb();
  await sdb.schoolVendor.create({
    data: scopedCreateData<Prisma.SchoolVendorUncheckedCreateInput>({
      name: data.name.trim(),
      category: data.category,
      contactName: data.contactName,
      phone: data.phone,
      email: data.email,
    }),
  });
  revalidatePath("/app/inventory");
}

export async function toggleVendorActive(vendorId: string) {
  await guard();
  const sdb = await getScopedDb();
  const vendor = await sdb.schoolVendor.findUniqueOrThrow({ where: { id: vendorId } });
  await sdb.schoolVendor.update({ where: { id: vendorId }, data: { isActive: !vendor.isActive } });
  revalidatePath("/app/inventory");
}

// --------------------------------------------------------- Purchase orders

export async function createPurchaseOrder(data: {
  poNumber: string;
  vendorId: string;
  consumableId: string | null;
  itemDescription: string;
  quantity: number;
  unitCost: number;
  orderDate: string;
}) {
  await guard();
  const sdb = await getScopedDb();
  await sdb.purchaseOrder.create({
    data: scopedCreateData<Prisma.PurchaseOrderUncheckedCreateInput>({
      poNumber: data.poNumber.trim(),
      vendorId: data.vendorId,
      consumableId: data.consumableId,
      itemDescription: data.itemDescription.trim(),
      quantity: data.quantity,
      unitCost: data.unitCost,
      orderDate: new Date(data.orderDate),
      status: "DRAFT",
    }),
  });
  revalidatePath("/app/inventory");
}

export async function updatePurchaseOrderStatus(poId: string, status: PurchaseOrderStatus) {
  await guard();
  const sdb = await getScopedDb();
  const po = await sdb.purchaseOrder.findUniqueOrThrow({ where: { id: poId }, include: { vendor: true } });

  if (status === "RECEIVED" && po.status !== "RECEIVED") {
    const total = Number(po.quantity) * Number(po.unitCost);
    const receivedDate = new Date();
    const ops: Prisma.PrismaPromise<unknown>[] = [
      sdb.purchaseOrder.update({ where: { id: poId }, data: { status, receivedDate } }),
      sdb.accountsTransaction.create({
        data: scopedCreateData<Prisma.AccountsTransactionUncheckedCreateInput>({
          date: receivedDate,
          description: `Purchase order ${po.poNumber} — ${po.itemDescription} (${po.vendor.name})`,
          category: "Inventory purchase",
          source: "AUTO_INVENTORY_PURCHASE",
          type: "EXPENSE",
          amount: total,
        }),
      }),
    ];
    if (po.consumableId) {
      ops.push(
        sdb.inventoryStockMovement.create({
          data: scopedCreateData<Prisma.InventoryStockMovementUncheckedCreateInput>({
            consumableId: po.consumableId,
            type: "IN",
            quantity: po.quantity,
            note: `PO ${po.poNumber} received`,
          }),
        }),
        sdb.inventoryConsumable.update({ where: { id: po.consumableId }, data: { quantityOnHand: { increment: po.quantity } } })
      );
    }
    await sdb.$transaction(ops);
  } else {
    await sdb.purchaseOrder.update({ where: { id: poId }, data: { status } });
  }

  revalidatePath("/app/inventory");
  revalidatePath("/app/accounts");
}

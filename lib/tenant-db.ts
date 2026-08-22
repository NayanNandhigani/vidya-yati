import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { auth } from "@/auth";

// Every model below platform level carries a direct `schoolId` column (see
// prisma/schema.prisma header comment). We discover that set from the DMMF
// at module load rather than hardcoding it, so a new model automatically
// gets scoped the moment someone adds a schoolId field to it — the whole
// point of centralizing this is that call sites should never be the thing
// that has to remember tenant scoping.
const TENANT_SCOPED_MODELS = new Set(
  Prisma.dmmf.datamodel.models
    .filter((model) => model.fields.some((field) => field.name === "schoolId"))
    .map((model) => model.name)
);

const FILTER_BY_WHERE_OPS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
  "update",
  "delete",
]);

/**
 * Returns a Prisma client scoped to a single school: every query against a
 * tenant-scoped model gets `schoolId` merged into its `where`, and every
 * create gets `schoolId` stamped onto its `data`. This is the ONLY
 * sanctioned way to read/write tenant data outside the Super Admin portal —
 * route handlers and server actions should call getScopedDb() (below)
 * rather than importing the raw `db` export.
 */
export function scopedDb(schoolId: string) {
  return db.$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const a = args as Record<string, unknown>;

          if (FILTER_BY_WHERE_OPS.has(operation)) {
            a.where = { ...((a.where as object) ?? {}), schoolId };
          } else if (operation === "upsert") {
            a.where = { ...((a.where as object) ?? {}), schoolId };
            a.create = { ...((a.create as object) ?? {}), schoolId };
          } else if (operation === "create") {
            a.data = { ...((a.data as object) ?? {}), schoolId };
          } else if (operation === "createMany" || operation === "createManyAndReturn") {
            const data = a.data;
            a.data = Array.isArray(data)
              ? data.map((row) => ({ ...row, schoolId }))
              : data;
          }

          return query(args);
        },
      },
    },
  });
}

export type ScopedDb = ReturnType<typeof scopedDb>;

/**
 * Server-side helper for route handlers / server actions: pulls schoolId
 * off the current session and returns a client scoped to it. Throws if
 * there's no session or no schoolId (Super Admin sessions have none —
 * Super Admin code should use `db` directly and query across schools
 * deliberately, since that's the one legitimate exception).
 */
/**
 * Prisma's generated `create` input types require `schoolId` (or a nested
 * `school: { connect }`) even though scopedDb()'s extension stamps it in at
 * query time and overwrites whatever's passed. Wrap a create payload with
 * this to omit schoolId at the call site without an inline `as unknown as`
 * cast at every one — e.g. `data: scopedCreateData<Prisma.StudentUncheckedCreateInput>({ name, classId })`.
 */
export function scopedCreateData<T extends { schoolId?: string | null }>(data: Omit<T, "schoolId">): T {
  return data as unknown as T;
}

export async function getScopedDb(): Promise<ScopedDb> {
  const session = await auth();
  if (!session?.user?.schoolId) {
    throw new Error(
      "getScopedDb() requires an authenticated session with a schoolId. " +
        "Super Admin routes should use `db` from lib/db.ts directly."
    );
  }
  return scopedDb(session.user.schoolId);
}

import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { getStore } from "@netlify/blobs";

// Two backends behind the same three functions, chosen at call time by
// `process.env.NETLIFY` (set to "true" in every Netlify build/runtime
// environment automatically — unset in plain local dev and in any other
// host):
//   - Local dev: local-disk storage under DATA/uploads, unchanged from
//     the original implementation — no Netlify credentials needed to run
//     `npm run dev`.
//   - Deployed on Netlify: Netlify Blobs, since Netlify Functions have no
//     persistent filesystem (a local-disk write there vanishes the
//     moment the function instance is recycled). `getStore()` picks up
//     its site/token context automatically inside a Netlify Function —
//     no manual configuration needed.
// storagePath (e.g. "certificate-logos/<uuid>-name.png") is the one
// identifier every caller already deals in, so this split is invisible
// to all 16 call sites across the app.
const ON_NETLIFY = process.env.NETLIFY === "true";
const UPLOAD_ROOT = path.join(process.cwd(), "DATA", "uploads");
const BLOB_STORE_NAME = "uploads";

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

/** Writes a file under subdir/ and returns its storagePath (e.g. "subdir/<uuid>-name.ext") plus the generated file name. */
export async function saveUploadedFile(subdir: string, originalName: string, bytes: Buffer): Promise<{ storagePath: string; fileName: string }> {
  const fileName = `${randomUUID()}-${safeFileName(originalName)}`;
  // Always forward-slash, regardless of OS — storagePath gets embedded
  // directly into public URLs (see app/api/website-assets), and Windows'
  // path.join would otherwise return backslash-separated segments here.
  const storagePath = `${subdir}/${fileName}`;

  if (ON_NETLIFY) {
    const store = getStore(BLOB_STORE_NAME);
    await store.set(storagePath, new Uint8Array(bytes).buffer as ArrayBuffer);
  } else {
    const dir = path.join(UPLOAD_ROOT, subdir);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, fileName), bytes);
  }

  return { storagePath, fileName };
}

export async function readUploadedFile(storagePath: string): Promise<Buffer> {
  if (ON_NETLIFY) {
    const store = getStore(BLOB_STORE_NAME);
    const bytes = await store.get(storagePath, { type: "arrayBuffer" });
    if (!bytes) throw new Error(`Blob not found: ${storagePath}`);
    return Buffer.from(bytes);
  }
  return fs.readFile(path.join(UPLOAD_ROOT, storagePath));
}

export async function deleteUploadedFile(storagePath: string): Promise<void> {
  if (ON_NETLIFY) {
    const store = getStore(BLOB_STORE_NAME);
    await store.delete(storagePath).catch(() => {});
    return;
  }
  await fs.unlink(path.join(UPLOAD_ROOT, storagePath)).catch(() => {});
}

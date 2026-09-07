import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";

// Local-disk file storage for uploaded documents (school contracts,
// registration certs, etc). Mirrors the project's existing "no cloud
// service in local dev" pattern (see scripts/local-db.ts) — files live
// under DATA/uploads, next to the local Postgres data directory, and
// storagePath in the DB is the path relative to that root so swapping to
// real object storage later only means changing these two functions.
const UPLOAD_ROOT = path.join(process.cwd(), "DATA", "uploads");

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

/** Writes a file under DATA/uploads/<subdir>/ and returns its storagePath (relative to UPLOAD_ROOT) plus the generated file name. */
export async function saveUploadedFile(subdir: string, originalName: string, bytes: Buffer): Promise<{ storagePath: string; fileName: string }> {
  const dir = path.join(UPLOAD_ROOT, subdir);
  await fs.mkdir(dir, { recursive: true });

  const fileName = `${randomUUID()}-${safeFileName(originalName)}`;
  const fullPath = path.join(dir, fileName);
  await fs.writeFile(fullPath, bytes);

  // Always forward-slash, regardless of OS — storagePath gets embedded
  // directly into public URLs (see app/api/website-assets), and Windows'
  // path.join would otherwise return backslash-separated segments here.
  return { storagePath: `${subdir}/${fileName}`, fileName };
}

export async function readUploadedFile(storagePath: string): Promise<Buffer> {
  return fs.readFile(path.join(UPLOAD_ROOT, storagePath));
}

export async function deleteUploadedFile(storagePath: string): Promise<void> {
  await fs.unlink(path.join(UPLOAD_ROOT, storagePath)).catch(() => {});
}

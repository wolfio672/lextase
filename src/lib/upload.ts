import "server-only";
import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

const IMAGE_SIGNATURES: { ext: string; mime: string; match: (buf: Buffer) => boolean }[] = [
  { ext: "jpg", mime: "image/jpeg", match: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", mime: "image/png", match: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: "gif", mime: "image/gif", match: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
  {
    ext: "webp",
    mime: "image/webp",
    match: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP",
  },
];

const VIDEO_SIGNATURES: { ext: string; mime: string; match: (buf: Buffer) => boolean }[] = [
  { ext: "mp4", mime: "video/mp4", match: (b) => b.subarray(4, 8).toString("ascii") === "ftyp" },
  {
    ext: "webm",
    mime: "video/webm",
    match: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3,
  },
];

export class UploadError extends Error {}

function sniff(buffer: Buffer, signatures: typeof IMAGE_SIGNATURES) {
  return signatures.find((s) => s.match(buffer));
}

// Store persists across deploys (site-wide, not deploy-scoped) so uploads survive redeploys.
function uploadsStore() {
  return getStore({ name: "uploads", consistency: "strong" });
}

async function saveFile(buffer: Buffer, subdir: string, ext: string, mime: string): Promise<string> {
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
  const key = `${subdir}/${filename}`;
  await uploadsStore().set(key, new Blob([new Uint8Array(buffer)]), { metadata: { contentType: mime } });
  return `/uploads/${key}`;
}

/** Validates by magic bytes (not the client-supplied MIME type) and writes an image to Blobs. */
export async function saveImage(file: File, subdir: string, maxBytes: number): Promise<string> {
  if (file.size === 0) throw new UploadError("Fichier vide");
  if (file.size > maxBytes) throw new UploadError(`Le fichier dépasse ${Math.round(maxBytes / 1024 / 1024)} Mo`);

  const buffer = Buffer.from(await file.arrayBuffer());
  const match = sniff(buffer, IMAGE_SIGNATURES);
  if (!match) throw new UploadError("Format d'image non supporté (jpg, png, gif, webp uniquement)");

  return saveFile(buffer, subdir, match.ext, match.mime);
}

/** Validates by magic bytes and writes an image or video to Blobs. */
export async function saveMedia(
  file: File,
  subdir: string,
  maxImageBytes: number,
  maxVideoBytes: number,
): Promise<{ url: string; type: "image" | "video" }> {
  if (file.size === 0) throw new UploadError("Fichier vide");

  const buffer = Buffer.from(await file.arrayBuffer());
  const imageMatch = sniff(buffer, IMAGE_SIGNATURES);
  if (imageMatch) {
    if (file.size > maxImageBytes) throw new UploadError(`L'image dépasse ${Math.round(maxImageBytes / 1024 / 1024)} Mo`);
    const url = await saveFile(buffer, subdir, imageMatch.ext, imageMatch.mime);
    return { url, type: "image" };
  }

  const videoMatch = sniff(buffer, VIDEO_SIGNATURES);
  if (videoMatch) {
    if (file.size > maxVideoBytes) throw new UploadError(`La vidéo dépasse ${Math.round(maxVideoBytes / 1024 / 1024)} Mo`);
    const url = await saveFile(buffer, subdir, videoMatch.ext, videoMatch.mime);
    return { url, type: "video" };
  }

  throw new UploadError("Format non supporté (jpg, png, gif, webp, mp4, webm uniquement)");
}

/** Best-effort delete of a previously uploaded file from Blobs. Ignores anything outside /uploads/. */
export async function deleteUploadedFile(url: string): Promise<void> {
  if (!url.startsWith("/uploads/")) return;
  const key = url.slice("/uploads/".length);
  await uploadsStore()
    .delete(key)
    .catch(() => {});
}

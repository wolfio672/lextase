"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/session";
import { saveMedia, UploadError } from "@/lib/upload";

export type SimpleActionState = { error?: string } | null;

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const captionSchema = z.string().trim().max(2000);

export async function createPostAction(_prev: SimpleActionState, formData: FormData): Promise<SimpleActionState> {
  const user = await requireRole("CREATOR");

  const parsed = captionSchema.safeParse(formData.get("caption") ?? "");
  if (!parsed.success) return { error: "Légende trop longue" };
  const caption = parsed.data;

  const isPremium = formData.get("isPremium") === "on";
  const file = formData.get("media");

  if ((!file || !(file instanceof File) || file.size === 0) && caption.length === 0) {
    return { error: "Ajoute une légende ou un média" };
  }

  const post = await db.post.create({
    data: { authorId: user.id, caption, isPremium },
  });

  if (file instanceof File && file.size > 0) {
    try {
      const { url, type } = await saveMedia(file, "media", MAX_IMAGE_BYTES, MAX_VIDEO_BYTES);
      await db.media.create({ data: { ownerId: user.id, postId: post.id, url, type } });
    } catch (err) {
      await db.post.delete({ where: { id: post.id } });
      return { error: err instanceof UploadError ? err.message : "Échec de l'envoi du média" };
    }
  }

  await writeAuditLog({
    actorId: user.id,
    targetId: user.id,
    action: "post.created",
    metadata: { postId: post.id, isPremium },
    ipAddress: await getClientIp(),
  });

  revalidatePath(`/creator/${user.username}`);
  revalidatePath("/feed");
  return null;
}

export async function deletePostAction(_prev: SimpleActionState, formData: FormData): Promise<SimpleActionState> {
  const user = await requireRole("CREATOR");
  const postId = String(formData.get("postId") ?? "");

  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post || post.authorId !== user.id) return { error: "Publication introuvable" };

  await db.post.delete({ where: { id: postId } });
  await writeAuditLog({
    actorId: user.id,
    targetId: user.id,
    action: "post.deleted",
    metadata: { postId },
    ipAddress: await getClientIp(),
  });

  revalidatePath(`/creator/${user.username}`);
  revalidatePath("/feed");
  return null;
}

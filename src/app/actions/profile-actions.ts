"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/session";
import { saveImage, deleteUploadedFile, UploadError } from "@/lib/upload";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MAX_BANNER_BYTES = 8 * 1024 * 1024;

export type SimpleActionState = { error?: string; success?: boolean } | null;

const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Nom d'affichage requis").max(50),
  bio: z.string().trim().max(280, "280 caractères maximum").optional().default(""),
});

export async function updateProfileAction(_prev: SimpleActionState, formData: FormData): Promise<SimpleActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  await db.user.update({
    where: { id: user.id },
    data: { displayName: parsed.data.displayName, bio: parsed.data.bio },
  });
  await writeAuditLog({
    actorId: user.id,
    targetId: user.id,
    action: "user.profile_updated",
    ipAddress: await getClientIp(),
  });
  revalidatePath("/settings");
  return { success: true };
}

export async function updateAvatarAction(_prev: SimpleActionState, formData: FormData): Promise<SimpleActionState> {
  const user = await requireUser();
  const file = formData.get("avatar");
  if (!(file instanceof File)) return { error: "Aucun fichier reçu" };

  let url: string;
  try {
    url = await saveImage(file, "avatars", MAX_AVATAR_BYTES);
  } catch (err) {
    return { error: err instanceof UploadError ? err.message : "Échec de l'envoi" };
  }

  const previous = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { avatarUrl: true } });
  await db.user.update({ where: { id: user.id }, data: { avatarUrl: url } });
  if (previous.avatarUrl) await deleteUploadedFile(previous.avatarUrl);

  await writeAuditLog({ actorId: user.id, targetId: user.id, action: "user.avatar_updated", ipAddress: await getClientIp() });
  revalidatePath("/settings");
  return { success: true };
}

export async function removeAvatarAction(): Promise<SimpleActionState> {
  const user = await requireUser();
  const previous = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { avatarUrl: true } });
  if (!previous.avatarUrl) return { success: true };

  await db.user.update({ where: { id: user.id }, data: { avatarUrl: null } });
  await deleteUploadedFile(previous.avatarUrl);
  await writeAuditLog({ actorId: user.id, targetId: user.id, action: "user.avatar_removed", ipAddress: await getClientIp() });
  revalidatePath("/settings");
  return { success: true };
}

export async function updateBannerAction(_prev: SimpleActionState, formData: FormData): Promise<SimpleActionState> {
  const user = await requireUser();
  const file = formData.get("banner");
  if (!(file instanceof File)) return { error: "Aucun fichier reçu" };

  let url: string;
  try {
    url = await saveImage(file, "banners", MAX_BANNER_BYTES);
  } catch (err) {
    return { error: err instanceof UploadError ? err.message : "Échec de l'envoi" };
  }

  const previous = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { bannerUrl: true } });
  await db.user.update({ where: { id: user.id }, data: { bannerUrl: url } });
  if (previous.bannerUrl) await deleteUploadedFile(previous.bannerUrl);

  await writeAuditLog({ actorId: user.id, targetId: user.id, action: "user.banner_updated", ipAddress: await getClientIp() });
  revalidatePath("/settings");
  return { success: true };
}

export async function removeBannerAction(): Promise<SimpleActionState> {
  const user = await requireUser();
  const previous = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { bannerUrl: true } });
  if (!previous.bannerUrl) return { success: true };

  await db.user.update({ where: { id: user.id }, data: { bannerUrl: null } });
  await deleteUploadedFile(previous.bannerUrl);
  await writeAuditLog({ actorId: user.id, targetId: user.id, action: "user.banner_removed", ipAddress: await getClientIp() });
  revalidatePath("/settings");
  return { success: true };
}

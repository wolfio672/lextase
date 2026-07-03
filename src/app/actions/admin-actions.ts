"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole, hasRole } from "@/lib/auth";
import { getClientIp } from "@/lib/session";
import { destroyAllSessionsForUser } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { changeRoleSchema, banUserSchema } from "@/lib/validation";
import type { Role } from "@prisma/client";

export type SimpleActionState = { error?: string } | null;

/**
 * FOUNDER can assign any role. ADMIN can only move accounts between USER and
 * CREATOR — staff roles (ADMIN, FOUNDER) can only be granted or revoked by a FOUNDER.
 */
function canChangeRole(actorRole: Role, targetCurrentRole: Role, newRole: Role): boolean {
  if (actorRole === "FOUNDER") return true;
  if (actorRole === "ADMIN") {
    const staffRoles: Role[] = ["ADMIN", "FOUNDER"];
    return !staffRoles.includes(targetCurrentRole) && !staffRoles.includes(newRole);
  }
  return false;
}

function canModerate(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === "FOUNDER") return targetRole !== "FOUNDER";
  if (actorRole === "ADMIN") return targetRole === "USER" || targetRole === "CREATOR";
  return false;
}

export async function changeRoleAction(_prev: SimpleActionState, formData: FormData): Promise<SimpleActionState> {
  const actor = await requireRole("ADMIN");
  const parsed = changeRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: "Données invalides" };
  const { userId, role } = parsed.data;

  if (userId === actor.id) return { error: "Vous ne pouvez pas modifier votre propre rôle" };

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "Utilisateur introuvable" };

  if (!canChangeRole(actor.role, target.role, role)) {
    return { error: "Permissions insuffisantes pour effectuer ce changement" };
  }

  await db.user.update({ where: { id: userId }, data: { role } });
  await destroyAllSessionsForUser(userId);
  await writeAuditLog({
    actorId: actor.id,
    targetId: userId,
    action: "admin.role_changed",
    metadata: { from: target.role, to: role },
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/users");
  return null;
}

export async function banUserAction(_prev: SimpleActionState, formData: FormData): Promise<SimpleActionState> {
  const actor = await requireRole("ADMIN");
  const parsed = banUserSchema.safeParse({
    userId: formData.get("userId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: "Données invalides" };
  const { userId, reason } = parsed.data;

  if (userId === actor.id) return { error: "Vous ne pouvez pas vous bannir vous-même" };

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "Utilisateur introuvable" };
  if (!canModerate(actor.role, target.role)) {
    return { error: "Permissions insuffisantes pour bannir cet utilisateur" };
  }

  await db.user.update({ where: { id: userId }, data: { isBanned: true, bannedReason: reason } });
  await destroyAllSessionsForUser(userId);
  await writeAuditLog({
    actorId: actor.id,
    targetId: userId,
    action: "admin.user_banned",
    metadata: { reason },
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/users");
  return null;
}

export async function deleteUserAction(_prev: SimpleActionState, formData: FormData): Promise<SimpleActionState> {
  const actor = await requireRole("ADMIN");
  const userId = String(formData.get("userId") ?? "");

  if (userId === actor.id) return { error: "Vous ne pouvez pas supprimer votre propre compte" };

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "Utilisateur introuvable" };
  if (!canModerate(actor.role, target.role)) {
    return { error: "Permissions insuffisantes pour supprimer ce compte" };
  }

  await writeAuditLog({
    actorId: actor.id,
    targetId: userId,
    action: "admin.user_deleted",
    metadata: { username: target.username, email: target.email, role: target.role },
    ipAddress: await getClientIp(),
  });

  // Runs after the log above so the entry keeps a targetId until the FK is
  // nulled out by the cascade — see the SetNull relation on AuditLog.target.
  await db.user.delete({ where: { id: userId } });

  revalidatePath("/admin/users");
  return null;
}

export async function setVerifiedAction(_prev: SimpleActionState, formData: FormData): Promise<SimpleActionState> {
  const actor = await requireRole("ADMIN");
  const userId = String(formData.get("userId") ?? "");
  const verified = formData.get("verified") === "true";

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "Utilisateur introuvable" };
  if (!canModerate(actor.role, target.role)) {
    return { error: "Permissions insuffisantes" };
  }

  await db.user.update({ where: { id: userId }, data: { isVerified: verified } });
  await writeAuditLog({
    actorId: actor.id,
    targetId: userId,
    action: verified ? "admin.user_verified" : "admin.user_unverified",
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/users");
  return null;
}

export async function unbanUserAction(_prev: SimpleActionState, formData: FormData): Promise<SimpleActionState> {
  const actor = await requireRole("ADMIN");
  const userId = String(formData.get("userId") ?? "");
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "Utilisateur introuvable" };
  if (!canModerate(actor.role, target.role)) {
    return { error: "Permissions insuffisantes" };
  }

  await db.user.update({ where: { id: userId }, data: { isBanned: false, bannedReason: null } });
  await writeAuditLog({
    actorId: actor.id,
    targetId: userId,
    action: "admin.user_unbanned",
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/users");
  return null;
}

/** FOUNDER-only: gifts a user a free, active subscription to a creator, bypassing Stripe entirely. */
export async function grantSubscriptionAction(_prev: SimpleActionState, formData: FormData): Promise<SimpleActionState> {
  const actor = await requireRole("FOUNDER");
  const userId = String(formData.get("userId") ?? "");
  const creatorUsername = String(formData.get("creatorUsername") ?? "").trim().toLowerCase();
  if (!creatorUsername) return { error: "Choisis un·e créateur·rice" };

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "Utilisateur introuvable" };

  const creator = await db.user.findUnique({ where: { username: creatorUsername } });
  if (!creator) return { error: "Créateur introuvable" };
  if (!hasRole(creator, "CREATOR")) return { error: "Ce compte n'est pas un créateur" };
  if (creator.id === userId) return { error: "Un compte ne peut pas s'abonner à lui-même" };

  await db.subscription.upsert({
    where: { subscriberId_creatorId: { subscriberId: userId, creatorId: creator.id } },
    update: { status: "ACTIVE", startedAt: new Date(), endsAt: null },
    create: { subscriberId: userId, creatorId: creator.id, status: "ACTIVE" },
  });

  await writeAuditLog({
    actorId: actor.id,
    targetId: userId,
    action: "admin.subscription_granted",
    metadata: { creatorUsername: creator.username },
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/users");
  revalidatePath(`/creator/${creator.username}`);
  return null;
}

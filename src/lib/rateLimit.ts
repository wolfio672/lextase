import "server-only";
import { db } from "@/lib/db";
import type { User } from "@prisma/client";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const IP_WINDOW_MINUTES = 10;
const MAX_ATTEMPTS_PER_IP = 20;

export async function isIpRateLimited(ipAddress: string): Promise<boolean> {
  const since = new Date(Date.now() - IP_WINDOW_MINUTES * 60 * 1000);
  const count = await db.loginAttempt.count({
    where: { ipAddress, createdAt: { gte: since } },
  });
  return count >= MAX_ATTEMPTS_PER_IP;
}

export function isAccountLocked(user: Pick<User, "lockedUntil">): boolean {
  return !!user.lockedUntil && user.lockedUntil > new Date();
}

export async function recordLoginAttempt(params: {
  userId: string | null;
  email: string;
  ipAddress: string;
  success: boolean;
}): Promise<void> {
  await db.loginAttempt.create({
    data: {
      userId: params.userId,
      email: params.email,
      ipAddress: params.ipAddress,
      success: params.success,
    },
  });
}

/** Increments the failure counter and locks the account once the threshold is hit. */
export async function registerFailedLogin(userId: string): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { failedLoginCount: true } });
  if (!user) return;

  const nextCount = user.failedLoginCount + 1;
  if (nextCount >= MAX_FAILED_ATTEMPTS) {
    await db.user.update({
      where: { id: userId },
      data: { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) },
    });
  } else {
    await db.user.update({ where: { id: userId }, data: { failedLoginCount: nextCount } });
  }
}

export async function resetFailedLogins(userId: string): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { failedLoginCount: 0, lockedUntil: null } });
}

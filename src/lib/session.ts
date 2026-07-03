import "server-only";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { randomToken, sha256Hex, signValue, verifySignedValue } from "@/lib/crypto";
import type { Role } from "@prisma/client";

const SESSION_COOKIE = "lx_session";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 jours
const PENDING_2FA_COOKIE = "lx_2fa_pending";
const PENDING_2FA_TTL_SECONDS = 5 * 60; // 5 minutes

export type SessionUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: Role;
  avatarUrl: string | null;
  twoFactorEnabled: boolean;
};

function isSecureContext(): boolean {
  return process.env.NODE_ENV === "production" || (process.env.APP_URL?.startsWith("https") ?? false);
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

export async function createSession(userId: string): Promise<void> {
  const token = randomToken(32);
  const tokenHash = sha256Hex(token);
  const h = await headers();
  const jar = await cookies();

  await db.session.create({
    data: {
      tokenHash,
      userId,
      userAgent: h.get("user-agent")?.slice(0, 255) ?? null,
      ipAddress: await getClientIp(),
      expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
    },
  });

  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = sha256Hex(token);
    await db.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await db.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = sha256Hex(token);
  const session = await db.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return null;
  }

  if (session.user.isBanned) {
    await db.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    username: session.user.username,
    displayName: session.user.displayName,
    role: session.user.role,
    avatarUrl: session.user.avatarUrl,
    twoFactorEnabled: session.user.twoFactorEnabled,
  };
}

/** Short-lived signed cookie proving "password verified, awaiting 2FA code" — never grants access by itself. */
export async function setPending2FACookie(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(PENDING_2FA_COOKIE, signValue(userId, PENDING_2FA_TTL_SECONDS), {
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: "lax",
    path: "/",
    maxAge: PENDING_2FA_TTL_SECONDS,
  });
}

export async function getPending2FAUserId(): Promise<string | null> {
  const jar = await cookies();
  const signed = jar.get(PENDING_2FA_COOKIE)?.value;
  if (!signed) return null;
  return verifySignedValue(signed);
}

export async function clearPending2FACookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(PENDING_2FA_COOKIE);
}

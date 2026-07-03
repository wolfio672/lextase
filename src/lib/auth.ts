import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "@/lib/session";
import type { Role } from "@prisma/client";

export async function getCurrentUser(): Promise<SessionUser | null> {
  return getSessionUser();
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

const ROLE_RANK: Record<Role, number> = {
  USER: 0,
  CREATOR: 1,
  ADMIN: 2,
  FOUNDER: 3,
};

export function hasRole(user: Pick<SessionUser, "role">, minimum: Role): boolean {
  return ROLE_RANK[user.role] >= ROLE_RANK[minimum];
}

/** Redirects to /login if unauthenticated, or to / if authenticated but under-privileged. */
export async function requireRole(minimum: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasRole(user, minimum)) {
    redirect("/");
  }
  return user;
}

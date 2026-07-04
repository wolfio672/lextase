"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  createSession,
  destroyCurrentSession,
  destroyAllSessionsForUser,
  getClientIp,
  getPending2FAUserId,
  clearPending2FACookie,
  setPending2FACookie,
} from "@/lib/session";
import { isIpRateLimited, isAccountLocked, recordLoginAttempt, registerFailedLogin, resetFailedLogins } from "@/lib/rateLimit";
import { writeAuditLog } from "@/lib/audit";
import { hashRecoveryCode, verifyTotpToken } from "@/lib/twofactor";
import { randomToken, sha256Hex } from "@/lib/crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { appUrl } from "@/lib/stripe";
import {
  loginSchema,
  registerSchema,
  twoFactorTokenSchema,
  recoveryCodeSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validation";

const RESET_TOKEN_TTL_MINUTES = 30;

export type ActionState = { error?: string } | null;

// Pre-computed bcrypt hash of a random value, compared against on unknown emails
// so login timing doesn't reveal whether the account exists.
const DUMMY_HASH = "$2b$12$CtiiVL3mgzPGB9/LW6q17eA9S.ZFtAWtmf2NMIoSzAcr2Hnb4qkSq";

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    displayName: formData.get("displayName"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const { email, username, displayName, password } = parsed.data;

  const existing = await db.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { id: true },
  });
  if (existing) {
    return { error: "Cet e-mail ou ce nom d'utilisateur est déjà utilisé" };
  }

  const passwordHash = await hashPassword(password);
  const ipAddress = await getClientIp();

  const user = await db.user.create({
    data: { email, username, displayName, passwordHash },
  });

  await writeAuditLog({ actorId: user.id, targetId: user.id, action: "user.register", ipAddress });
  await createSession(user.id);
  redirect("/feed");
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const { email, password } = parsed.data;
  const ipAddress = await getClientIp();

  if (await isIpRateLimited(ipAddress)) {
    return { error: "Trop de tentatives depuis cette adresse, réessayez plus tard" };
  }

  const user = await db.user.findUnique({ where: { email } });

  if (user && isAccountLocked(user)) {
    await recordLoginAttempt({ userId: user.id, email, ipAddress, success: false });
    return { error: "Compte temporairement verrouillé suite à plusieurs échecs, réessayez plus tard" };
  }

  const passwordValid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordValid) {
    await recordLoginAttempt({ userId: user?.id ?? null, email, ipAddress, success: false });
    if (user) await registerFailedLogin(user.id);
    return { error: "E-mail ou mot de passe incorrect" };
  }

  if (user.isBanned) {
    await recordLoginAttempt({ userId: user.id, email, ipAddress, success: false });
    return { error: "Ce compte a été suspendu" };
  }

  await resetFailedLogins(user.id);
  await recordLoginAttempt({ userId: user.id, email, ipAddress, success: true });

  if (user.twoFactorEnabled) {
    await setPending2FACookie(user.id);
    redirect("/verify-2fa");
  }

  await createSession(user.id);
  await writeAuditLog({ actorId: user.id, targetId: user.id, action: "user.login", ipAddress });
  redirect("/feed");
}

export async function verify2FAAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await getPending2FAUserId();
  if (!userId) {
    redirect("/login");
  }

  const rawCode = String(formData.get("code") ?? "").trim();
  const ipAddress = await getClientIp();
  const user = await db.user.findUnique({ where: { id: userId } });

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    await clearPending2FACookie();
    redirect("/login");
  }

  if (isAccountLocked(user)) {
    return { error: "Compte temporairement verrouillé, réessayez plus tard" };
  }

  const totpAttempt = twoFactorTokenSchema.safeParse(rawCode);
  const recoveryAttempt = recoveryCodeSchema.safeParse(rawCode);

  let success = false;

  if (totpAttempt.success) {
    const result = await verifyTotpToken(totpAttempt.data, user.twoFactorSecret, user.lastTotpTimeStep);
    if (result.valid) {
      success = true;
      await db.user.update({ where: { id: user.id }, data: { lastTotpTimeStep: result.timeStep } });
    }
  } else if (recoveryAttempt.success) {
    const stored: string[] = user.twoFactorRecoveryCodes ? JSON.parse(user.twoFactorRecoveryCodes) : [];
    const hashedInput = hashRecoveryCode(recoveryAttempt.data);
    const index = stored.indexOf(hashedInput);
    if (index !== -1) {
      success = true;
      stored.splice(index, 1);
      await db.user.update({
        where: { id: user.id },
        data: { twoFactorRecoveryCodes: JSON.stringify(stored) },
      });
      await writeAuditLog({ actorId: user.id, targetId: user.id, action: "2fa.recovery_code_used", ipAddress });
    }
  } else {
    return { error: "Code invalide" };
  }

  if (!success) {
    await recordLoginAttempt({ userId: user.id, email: user.email, ipAddress, success: false });
    await registerFailedLogin(user.id);
    return { error: "Code incorrect" };
  }

  await resetFailedLogins(user.id);
  await recordLoginAttempt({ userId: user.id, email: user.email, ipAddress, success: true });
  await clearPending2FACookie();
  await createSession(user.id);
  await writeAuditLog({ actorId: user.id, targetId: user.id, action: "user.login_2fa", ipAddress });
  redirect("/feed");
}

export async function logoutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect("/login");
}

export type ForgotPasswordState = { error?: string; success?: boolean } | null;

export async function requestPasswordResetAction(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const { email } = parsed.data;
  const ipAddress = await getClientIp();

  // Same response whether or not the account exists, and rate-limited the same
  // way as login, so this can't be used to enumerate registered emails.
  if (await isIpRateLimited(ipAddress)) {
    return { success: true };
  }

  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (user) {
    const token = randomToken(32);
    const tokenHash = sha256Hex(token);
    await db.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await db.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
      },
    });
    await sendPasswordResetEmail(email, `${appUrl()}/reset-password/${token}`);
    await writeAuditLog({ actorId: user.id, targetId: user.id, action: "user.password_reset_requested", ipAddress });
  }

  return { success: true };
}

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const { token, password } = parsed.data;
  const tokenHash = sha256Hex(token);

  const resetToken = await db.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!resetToken || resetToken.expiresAt < new Date()) {
    return { error: "Ce lien de réinitialisation est invalide ou a expiré" };
  }

  const passwordHash = await hashPassword(password);
  const ipAddress = await getClientIp();

  await db.user.update({
    where: { id: resetToken.userId },
    data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
  });
  await db.passwordResetToken.deleteMany({ where: { userId: resetToken.userId } });
  await destroyAllSessionsForUser(resetToken.userId);
  await writeAuditLog({
    actorId: resetToken.userId,
    targetId: resetToken.userId,
    action: "user.password_reset",
    ipAddress,
  });

  redirect("/login?reset=1");
}

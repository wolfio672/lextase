"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getClientIp } from "@/lib/session";
import { signValue, verifySignedValue } from "@/lib/crypto";
import { verifyPassword } from "@/lib/password";
import {
  generateTotpSecret,
  generateTotpQrCode,
  generateRecoveryCodes,
  verifyTotpToken,
} from "@/lib/twofactor";
import { twoFactorTokenSchema } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";

const SETUP_COOKIE = "lx_2fa_setup";
const SETUP_TTL_SECONDS = 10 * 60;

export type TwoFactorActionState =
  | { error?: string; success?: false }
  | { success: true; recoveryCodes: string[] }
  | null;

export async function beginTwoFactorSetupAction(): Promise<{ qrCodeDataUrl: string; manualEntryKey: string }> {
  const user = await requireUser();
  const secret = generateTotpSecret();
  const jar = await cookies();
  jar.set(SETUP_COOKIE, signValue(secret, SETUP_TTL_SECONDS), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SETUP_TTL_SECONDS,
  });
  const qrCodeDataUrl = await generateTotpQrCode(user.email, secret);
  return { qrCodeDataUrl, manualEntryKey: secret };
}

export async function confirmTwoFactorSetupAction(
  _prev: TwoFactorActionState,
  formData: FormData,
): Promise<TwoFactorActionState> {
  const user = await requireUser();
  const jar = await cookies();
  const signed = jar.get(SETUP_COOKIE)?.value;
  const secret = signed ? verifySignedValue(signed) : null;

  if (!secret) {
    return { error: "La session de configuration a expiré, recommencez" };
  }

  const parsed = twoFactorTokenSchema.safeParse(formData.get("code"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Code invalide" };
  }

  const result = await verifyTotpToken(parsed.data, secret, null);
  if (!result.valid) {
    return { error: "Code incorrect" };
  }

  const { plain, hashed } = generateRecoveryCodes();
  const ipAddress = await getClientIp();

  await db.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorSecret: secret,
      twoFactorRecoveryCodes: JSON.stringify(hashed),
      lastTotpTimeStep: result.timeStep,
    },
  });
  jar.delete(SETUP_COOKIE);
  await writeAuditLog({ actorId: user.id, targetId: user.id, action: "2fa.enabled", ipAddress });

  return { success: true, recoveryCodes: plain };
}

export type SimpleActionState = { error?: string } | null;

export async function disableTwoFactorAction(_prev: SimpleActionState, formData: FormData): Promise<SimpleActionState> {
  const user = await requireUser();
  const password = String(formData.get("password") ?? "");
  const fullUser = await db.user.findUnique({ where: { id: user.id } });
  if (!fullUser) return { error: "Utilisateur introuvable" };

  const valid = await verifyPassword(password, fullUser.passwordHash);
  if (!valid) return { error: "Mot de passe incorrect" };

  const ipAddress = await getClientIp();
  await db.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorRecoveryCodes: null,
      lastTotpTimeStep: null,
    },
  });
  await writeAuditLog({ actorId: user.id, targetId: user.id, action: "2fa.disabled", ipAddress });
  return null;
}

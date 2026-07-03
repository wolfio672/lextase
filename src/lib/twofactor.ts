import "server-only";
import { generateSecret, generateURI, NobleCryptoPlugin, ScureBase32Plugin } from "otplib";
import { verify } from "@otplib/totp";
import QRCode from "qrcode";
import crypto from "node:crypto";
import { sha256Hex } from "@/lib/crypto";

const ISSUER = "L'extase";
const cryptoPlugin = new NobleCryptoPlugin();
const base32Plugin = new ScureBase32Plugin();

export function generateTotpSecret(): string {
  return generateSecret();
}

export async function generateTotpQrCode(email: string, secret: string): Promise<string> {
  const otpauth = generateURI({ issuer: ISSUER, label: email, secret });
  return QRCode.toDataURL(otpauth);
}

/**
 * Verifies a 6-digit TOTP code. `afterTimeStep`, when provided, rejects codes
 * from a time step already consumed (anti-replay for a captured code).
 * Returns the matched time step on success so the caller can persist it.
 */
export async function verifyTotpToken(
  token: string,
  secret: string,
  afterTimeStep?: number | null,
): Promise<{ valid: boolean; timeStep?: number }> {
  try {
    const result = await verify({
      secret,
      token,
      crypto: cryptoPlugin,
      base32: base32Plugin,
      epochTolerance: 30,
      afterTimeStep: afterTimeStep ?? undefined,
    });
    return result.valid ? { valid: true, timeStep: result.timeStep } : { valid: false };
  } catch {
    return { valid: false };
  }
}

function formatRecoveryCode(raw: string): string {
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

/** Returns plaintext codes (shown once to the user) and their hashes (stored in DB). */
export function generateRecoveryCodes(count = 8): { plain: string[]; hashed: string[] } {
  const plain: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(6).toString("hex");
    const formatted = formatRecoveryCode(raw);
    plain.push(formatted);
    hashed.push(sha256Hex(formatted.toLowerCase()));
  }
  return { plain, hashed };
}

export function hashRecoveryCode(code: string): string {
  return sha256Hex(code.trim().toLowerCase());
}

import crypto from "node:crypto";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET manquant ou trop court (32 caractères min) dans .env");
  }
  return secret;
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function hmacHex(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

/** Signs `payload.expiresAtEpochSeconds` with an HMAC, for short-lived stateless cookies. */
export function signValue(payload: string, ttlSeconds: number): string {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = `${payload}.${expires}`;
  const signature = hmacHex(body);
  return `${body}.${signature}`;
}

export function verifySignedValue(signed: string): string | null {
  const parts = signed.split(".");
  if (parts.length !== 3) return null;
  const [payload, expiresStr, signature] = parts;
  const body = `${payload}.${expiresStr}`;
  const expected = hmacHex(body);
  const sigBuf = Buffer.from(signature, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return payload;
}

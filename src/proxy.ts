import { NextResponse, type NextRequest } from "next/server";

// Fast, cookie-presence-only redirect for UX. This is NOT the authorization
// boundary: every protected page/server action re-checks the session and role
// against the database (see src/lib/auth.ts), since a cookie can be forged or
// stale and must never be trusted on its own.
const PROTECTED_PREFIXES = ["/feed", "/settings", "/admin", "/messages", "/creator"];

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  const devScript = isDev ? " 'unsafe-eval'" : "";
  // Dev preview tooling embeds the app in an iframe to take screenshots;
  // only lock framing down in production.
  const frameAncestors = isDev ? "frame-ancestors 'self'" : "frame-ancestors 'none'";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${devScript}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    frameAncestors,
    "upgrade-insecure-requests",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = request.cookies.has("lx_session");

  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) && !hasSessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Whether an already-authenticated visitor should be bounced off /login and
  // /register is decided by those pages themselves (a real DB session check),
  // not here — a stale cookie plus a naive presence check here would bounce
  // the browser back and forth between /login and a protected page forever.

  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("X-Frame-Options", "DENY");
  }
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/stripe|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};

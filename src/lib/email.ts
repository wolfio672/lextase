import "server-only";
import { Resend } from "resend";

let client: Resend | null | undefined;

/** Returns null (never throws) when RESEND_API_KEY isn't set. */
function getResend(): Resend | null {
  if (client !== undefined) return client;
  const key = process.env.RESEND_API_KEY;
  client = key ? new Resend(key) : null;
  return client;
}

/**
 * Sends the password reset email. When Resend isn't configured, logs the
 * link to the server console instead so the flow stays usable in dev/demo.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.log(`[email désactivé] Lien de réinitialisation pour ${to} : ${resetUrl}`);
    return;
  }

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "L'extase <onboarding@resend.dev>",
    to,
    subject: "Réinitialise ton mot de passe — L'extase",
    html: `
      <p>Tu as demandé à réinitialiser ton mot de passe sur L'extase.</p>
      <p><a href="${resetUrl}">Clique ici pour choisir un nouveau mot de passe</a> (lien valable 30 minutes).</p>
      <p>Si tu n'es pas à l'origine de cette demande, ignore cet e-mail.</p>
    `,
  });
}

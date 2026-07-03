import "dotenv/config";
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";
import { passwordSchema } from "../src/lib/validation";

async function main() {
  const email = process.env.FOUNDER_EMAIL?.trim().toLowerCase();
  const username = process.env.FOUNDER_USERNAME?.trim().toLowerCase();
  const password = process.env.FOUNDER_PASSWORD;

  if (!email || !username || !password) {
    throw new Error("FOUNDER_EMAIL, FOUNDER_USERNAME et FOUNDER_PASSWORD doivent être définis dans .env");
  }

  const strength = passwordSchema.safeParse(password);
  if (!strength.success) {
    throw new Error(`FOUNDER_PASSWORD trop faible : ${strength.error.issues[0]?.message}`);
  }

  const passwordHash = await hashPassword(password);

  const founder = await db.user.upsert({
    where: { email },
    update: { role: "FOUNDER" },
    create: {
      email,
      username,
      displayName: "Fondateur",
      passwordHash,
      role: "FOUNDER",
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`Compte fondateur prêt : ${founder.email} (@${founder.username})`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

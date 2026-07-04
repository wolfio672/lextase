import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Netlify Database (le module @netlify/database) injecte la connection
// string dans NETLIFY_DB_URL — disponible dans les builds, functions et
// edge functions. En dev local, DATABASE_URL est défini directement dans .env.
if (!process.env.DATABASE_URL && process.env.NETLIFY_DB_URL) {
  process.env.DATABASE_URL = process.env.NETLIFY_DB_URL;
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});

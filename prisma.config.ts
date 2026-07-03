import "dotenv/config";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Netlify's production/CI builds only inject NETLIFY_DATABASE_URL, never
// DATABASE_URL itself; local dev sets DATABASE_URL directly in .env.
if (!process.env.DATABASE_URL && process.env.NETLIFY_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.NETLIFY_DATABASE_URL;
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});

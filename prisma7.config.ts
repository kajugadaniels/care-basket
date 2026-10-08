// Prisma CLI configuration. Prisma 7 does not load env files on its own, so this file does.
// Local commands use .env.local. Commands explicitly run with NODE_ENV=production use
// .env.production. Existing shell variables win, and values are never printed.
// Run CLI commands with: npx prisma <command> --config prisma7.config.ts
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

const envFile = process.env["NODE_ENV"] === "production" ? ".env.production" : ".env.local";
config({ path: envFile, quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Neon's DIRECT (unpooled) connection: migrations need a session-level connection that the
    // pooler does not provide. The app itself uses the pooled DATABASE_URL at runtime.
    url: process.env["DIRECT_URL"],
  },
});

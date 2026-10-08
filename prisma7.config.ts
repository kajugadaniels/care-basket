// Prisma CLI configuration. Prisma 7 does not load env files on its own, so this file does.
// It reads .env.local first, then .env, like Next.js does locally: the first file that defines
// a variable wins, and variables already set in the shell win over both. Values are never printed.
// Run CLI commands with: npx prisma <command> --config prisma7.config.ts
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: [".env.local", ".env"], quiet: true });

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

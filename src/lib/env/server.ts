import "server-only";
import { z } from "zod";

const deviceEnvSchema = z.object({
  // Require a canonical base64url encoding of at least 32 random bytes.
  DEVICE_AUTH_SECRET: z.string().min(43).max(128).regex(/^[A-Za-z0-9_-]+$/)
    .refine((value) => Buffer.from(value, "base64url").length >= 32 &&
      Buffer.from(value, "base64url").toString("base64url") === value),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DEVICE_IP_SOURCE: z.enum(["unconfigured", "vercel"]).default("unconfigured"),
  VERCEL: z.enum(["1"]).optional(),
});

export function getDeviceEnv() {
  const result = deviceEnvSchema.safeParse({
    DEVICE_AUTH_SECRET: process.env.DEVICE_AUTH_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    DEVICE_IP_SOURCE: process.env.DEVICE_IP_SOURCE,
    VERCEL: process.env.VERCEL,
  });
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new Error(`Missing or invalid device environment variables: ${names.join(", ")}. See .env.local.example or .env.production.example.`);
  }
  return result.data;
}

// Server-only environment, validated on first use (never at import time).
// Error messages name missing variables but never print their values.
const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .regex(/^postgres(ql)?:\/\//, "must be a PostgreSQL connection string"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = serverEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
  });
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new Error(
      `Missing or invalid server environment variables: ${names.join(", ")}. See .env.local.example or .env.production.example.`,
    );
  }

  cachedEnv = result.data;
  return cachedEnv;
}

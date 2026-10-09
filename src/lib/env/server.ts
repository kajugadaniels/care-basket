import "server-only";
import { z } from "zod";
import { GEMINI_APPROVED_MODEL, GEMINI_DEPLOYMENT_APPROVAL } from "@/lib/ai/eligibility";

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

export function getCatalogEnv() {
	const result = z.strictObject({
		CATALOG_USER_AGENT: z.string().max(200).regex(/^CareBasket\/\d+\.\d+\.\d+ \([^\s()@]+@[^\s()@]+\.[^\s()@]+\)$/),
	}).safeParse({ CATALOG_USER_AGENT: process.env.CATALOG_USER_AGENT });
	if (!result.success) {
		throw new Error("Set CATALOG_USER_AGENT to CareBasket/<version> (<contact email>) before running catalog discovery.");
	}
	return result.data;
}

export function getShoppingAiConfig() {
	const parsed = z.strictObject({
		enabled: z.enum(["true", "false"]).default("false"),
		apiKey: z.string().min(20).max(256),
		model: z.string().min(1).max(100).regex(/^gemini-[a-z0-9.-]+$/),
	}).safeParse({ enabled: process.env.GEMINI_SHOPPING_ENABLED,
		apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL });
	if (!parsed.success || parsed.data.enabled !== "true" || !GEMINI_DEPLOYMENT_APPROVAL
		|| !GEMINI_APPROVED_MODEL || parsed.data.model !== GEMINI_APPROVED_MODEL) return null;
	return { apiKey: parsed.data.apiKey, model: parsed.data.model };
}

export function getAppOrigin() {
	return new URL(z.url().parse(process.env.NEXT_PUBLIC_APP_URL)).origin;
}

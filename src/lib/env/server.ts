import "server-only";
import { z } from "zod";

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
      `Missing or invalid server environment variables: ${names.join(", ")}. See .env.example.`,
    );
  }

  cachedEnv = result.data;
  return cachedEnv;
}

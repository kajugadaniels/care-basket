import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { getDeviceEnv } from "@/lib/env/server";

const secretSchema = z.string().length(43).regex(/^[A-Za-z0-9_-]{43}$/)
  .refine((value) => Buffer.from(value, "base64url").toString("base64url") === value);
export function deviceCookieName(kind: "pairing" | "device") {
  return `${getDeviceEnv().NODE_ENV === "production" ? "__Host-" : ""}cb_${kind}`;
}
export async function readDeviceCookie(kind: "pairing" | "device") {
  const parsed = secretSchema.safeParse((await cookies()).get(deviceCookieName(kind))?.value);
  return parsed.success ? parsed.data : null;
}
function cookieOptions() {
  return { httpOnly: true, secure: getDeviceEnv().NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
}
// Call only in a Server Action, after the corresponding database transaction commits.
export async function setDeviceCookie(kind: "pairing" | "device", secret: string, expiresAt: Date) {
  (await cookies()).set(deviceCookieName(kind), secret, { ...cookieOptions(), expires: expiresAt });
}
export async function clearPairingCookie() {
  (await cookies()).set(deviceCookieName("pairing"), "", { ...cookieOptions(), maxAge: 0 });
}

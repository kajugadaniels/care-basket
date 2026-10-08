// Shared error shape for server entry points (architecture.md § 8, api.md § 4).
// Type-only, so both Server Actions and Client Components can import it.

export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "PAYMENT_PROVIDER_ERROR"
  | "AI_UNAVAILABLE"
  | "INTERNAL";

export type ActionError = {
  code: AppErrorCode;
  // Friendly text for the user; never internal details.
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ActionError };

import "server-only";
import type { AppErrorCode } from "@/types/action-result";

// Narrow allow-list: callers cannot attach raw exceptions, cookies, codes, or names.
export function logSecurityFailure(input: {
  event: string; requestId: string; actorType: "ADULT" | "DEVICE" | "SYSTEM";
  code: AppErrorCode;
}) {
  console.error(JSON.stringify({ event: input.event, requestId: input.requestId,
    actorType: input.actorType, code: input.code }));
}

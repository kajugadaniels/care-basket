import type { AppErrorCode } from "@/types/action-result";

// Expected failures thrown by services. Entry points map them to safe responses.
export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string = code) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

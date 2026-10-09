import "server-only";
import { notFound } from "next/navigation";
import { AppError } from "@/server/errors";
import { requestListSchema } from "../schemas";

// Preserve auth redirects, runtime interrupts and unexpected failures.
export async function requestPageData<T>(read: () => Promise<T>): Promise<T> {
	try { return await read(); }
	catch (error) {
		if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
		throw error;
	}
}
export function parseRequestSearchParams(params: Record<string, string | string[] | undefined>) {
	const parsed = requestListSchema.safeParse({ after: params.after, status: params.status || undefined });
	if (!parsed.success) throw new AppError("VALIDATION_FAILED");
	return parsed.data;
}

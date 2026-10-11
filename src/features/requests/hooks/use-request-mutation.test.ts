import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { requestIds } from "@/test/factories/requests";
import type { RequestMutationResult } from "../types";
import { useRequestMutation } from "./use-request-mutation";

describe("synchronous request mutation guard", () => {
	it("blocks duplicate writes before pending has rendered and permits writes after confirmation", async () => {
		let finish: (result: RequestMutationResult) => void = () => {};
		const action = vi.fn(() => new Promise<RequestMutationResult>((resolve) => { finish = resolve; }));
		const duplicate = vi.fn();
		const success = vi.fn();
		const { result } = renderHook(useRequestMutation);

		act(() => {
			const beforeRender = result.current;
			beforeRender.run(action, success, "save:milk");
			expect(beforeRender.isRunning()).toBe(true);
			beforeRender.run(duplicate, undefined, "remove:bread");
		});
		expect(action).toHaveBeenCalledOnce();
		expect(duplicate).not.toHaveBeenCalled();
		expect(result.current.pendingKey).toBe("save:milk");
		expect(success).not.toHaveBeenCalled();

		await act(async () => finish({ ok: true, data: { requestId: requestIds.request } }));
		expect(success).toHaveBeenCalledOnce();
		expect(result.current.isRunning()).toBe(false);
		expect(result.current.pendingKey).toBeNull();
		const next = vi.fn().mockResolvedValue({ ok: true, data: { requestId: requestIds.request } });
		await act(async () => result.current.run(next));
		expect(next).toHaveBeenCalledOnce();
	});

	it("releases the guard after an error without discarding the error on a blocked call", async () => {
		let finish: (result: RequestMutationResult) => void = () => {};
		const action = vi.fn(() => new Promise<RequestMutationResult>((resolve) => { finish = resolve; }));
		const { result } = renderHook(useRequestMutation);
		act(() => result.current.run(action));
		act(() => result.current.run(action));
		expect(action).toHaveBeenCalledOnce();
		await act(async () => finish({ ok: false, error: { code: "CONFLICT", message: "Refresh before retrying." } }));
		expect(result.current.error).toBe("Refresh before retrying.");
		expect(result.current.isRunning()).toBe(false);
	});
});

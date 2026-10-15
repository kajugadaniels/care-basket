import { Suspense, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requester } from "@/test/factories/requests";
import { AppError } from "@/server/errors";
import { DraftProvider } from "@/features/requests/components/DraftProvider/DraftProvider";
import { ShopShell } from "@/features/devices/components/ShopShell/ShopShell";
import { AssistantProvider } from "@/features/assistant/components/AssistantProvider/AssistantProvider";

const mocks = vi.hoisted(() => ({ device: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/require-device", () => ({ requireDevice: mocks.device }));

import ShopLayout from "./layout";

type SessionProps = { children: ReactNode };

function session(children: ReactNode) {
	const layout = ShopLayout({ children });
	const element = layout.props.children as ReactElement<SessionProps>;
	const resolve = element.type as (props: SessionProps) => Promise<ReactNode>;
	return resolve(element.props);
}

describe("requester draft layout", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mocks.device.mockResolvedValue(requester);
	});

	it("defers session access to a child inside Suspense", () => {
		const layout = ShopLayout({ children: <p>Shopping</p> });
		expect(layout.type).toBe(Suspense);
		const fallback = layout.props.fallback as ReactElement<SessionProps>;
		expect(fallback.type).toBe(DraftProvider);
		expect((fallback.props.children as ReactElement).type).toBe(ShopShell);
		expect(mocks.device).not.toHaveBeenCalled();
	});

	it("keys the draft provider by device and profile without exposing the actor", async () => {
		const children = <p>Shopping</p>;
		const result = await session(children) as ReactElement<SessionProps>;
		expect(result.type).toBe(DraftProvider);
		expect(result.key).toBe(`${requester.deviceId}:${requester.profileId}`);
		const assistant = result.props.children as ReactElement<SessionProps>;
		expect(assistant.type).toBe(AssistantProvider);
		const shell = assistant.props.children as ReactElement<SessionProps>;
		expect(shell.type).toBe(ShopShell);
		expect(shell.props).toEqual({ children });
	});

	it("leaves reconnect rendering to the page for an unauthenticated device", async () => {
		mocks.device.mockRejectedValue(new AppError("UNAUTHENTICATED"));
		const children = <p>Reconnect</p>;
		const result = await session(children) as ReactElement<SessionProps>;
		expect(result.type).toBe(DraftProvider);
		const shell = result.props.children as ReactElement<SessionProps>;
		expect(shell.type).toBe(ShopShell);
		expect(shell.props).toEqual({ children });
	});

	it.each([new AppError("FORBIDDEN"), new Error("database unavailable")])(
		"propagates non-session failures to the route error boundary: %s",
		async (error) => {
			mocks.device.mockRejectedValue(error);
			await expect(session(<p>Shopping</p>)).rejects.toBe(error);
		},
	);
});

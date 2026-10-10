import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/server/errors";
import { makeDeviceActor } from "@/test/factories/devices";
import { resolveServerTree } from "@/test/resolve-server-tree";
import { assistantCopy } from "@/features/assistant/copy";

const fake = vi.hoisted(() => ({ device: vi.fn(), profile: vi.fn(), availability: vi.fn(), start: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/require-device", () => ({ requireDevice: fake.device }));
vi.mock("@/features/devices/server/service", () => ({ getShopHome: fake.profile }));
vi.mock("@/features/assistant/server/service", () => ({ assistantAvailability: fake.availability }));
vi.mock("@/features/assistant/components/AssistantStart/AssistantStart", () => ({
	AssistantStart: (props: { displayName: string; voice: boolean; child: boolean }) => {
		fake.start(props);
		return <h1>{assistantCopy.greeting({ name: props.displayName })}</h1>;
	},
}));

import AssistantPage from "./page";

describe("assistant landing page", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		fake.device.mockResolvedValue(makeDeviceActor());
		fake.profile.mockResolvedValue({ displayName: "Rose", avatarKey: "flower" });
		fake.availability.mockResolvedValue({ voice: false, child: false });
	});

	it("streams device and profile reads behind Suspense", () => {
		expect(AssistantPage().type).toBe(Suspense);
		expect(fake.device).not.toHaveBeenCalled();
		expect(fake.profile).not.toHaveBeenCalled();
		expect(fake.availability).not.toHaveBeenCalled();
	});

	it("greets only the assigned profile with minimal props and server-gated voice", async () => {
		render(await resolveServerTree(AssistantPage()));
		expect(fake.profile).toHaveBeenCalledExactlyOnceWith(makeDeviceActor());
		expect(fake.availability).toHaveBeenCalledExactlyOnceWith(makeDeviceActor());
		expect(fake.device.mock.invocationCallOrder[0]).toBeLessThan(fake.profile.mock.invocationCallOrder[0]);
		expect(fake.device.mock.invocationCallOrder[0]).toBeLessThan(fake.availability.mock.invocationCallOrder[0]);
		expect(fake.start).toHaveBeenCalledExactlyOnceWith({ displayName: "Rose", voice: false, child: false });
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hello, Rose!");
	});

	it.each(["missing", "expired", "revoked"])("does not read a private profile for a %s device", async () => {
		fake.device.mockRejectedValue(new AppError("UNAUTHENTICATED"));
		render(await resolveServerTree(AssistantPage()));
		expect(fake.profile).not.toHaveBeenCalled();
		expect(fake.availability).not.toHaveBeenCalled();
		expect(fake.start).not.toHaveBeenCalled();
		expect(screen.getByRole("link", { name: "Connect Again" })).toHaveAttribute("href", "/connect");
	});

	it("shows reconnect when the assigned profile becomes unavailable", async () => {
		fake.profile.mockRejectedValue(new AppError("UNAUTHENTICATED"));
		render(await resolveServerTree(AssistantPage()));
		expect(fake.start).not.toHaveBeenCalled();
		expect(screen.getByRole("link", { name: "Connect Again" })).toBeInTheDocument();
	});

	it.each([new AppError("FORBIDDEN"), new Error("database unavailable")])(
		"does not hide unexpected failures: %s",
		async (error) => {
			fake.availability.mockRejectedValue(error);
			await expect(resolveServerTree(AssistantPage())).rejects.toBe(error);
		},
	);
});

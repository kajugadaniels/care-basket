import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { familyLayoutCopy } from "@/features/family/copy";
import { ManagerLoading } from "@/features/family/components/ManagerLoading/ManagerLoading";
import FamilyLoading from "./family/loading";
import Loading from "./loading";

const streamedPages = [
	"family/page.tsx", "family/devices/page.tsx", "family/devices/connect/page.tsx",
	"family/members/page.tsx", "family/members/[profileId]/page.tsx", "family/members/[profileId]/edit/page.tsx",
	"family/requests/page.tsx", "family/requests/[requestId]/page.tsx",
];
const inheritedRoutes = [
	"devices", "devices/connect", "members", "members/add", "members/[profileId]",
	"members/[profileId]/edit", "requests", "setup",
];

describe("shared manager loading", () => {
	it("removes the manager catalog route without removing requester shopping", () => {
		expect(existsSync(resolve(process.cwd(), "src/app/(manager)/family/catalog/page.tsx"))).toBe(false);
		expect(existsSync(resolve(process.cwd(), "src/app/(device)/shop/products/page.tsx"))).toBe(true);
	});

	it.each([
		["route group", Loading], ["family content", FamilyLoading], ["data region", ManagerLoading],
	] as const)("shows visible progress without skeletons in the %s", (_name, Component) => {
		const { container } = render(<Component />);
		const status = screen.getByRole("status");
		expect(status).toHaveTextContent(familyLayoutCopy.loading);
		expect(screen.getByText(familyLayoutCopy.loading)).toBeVisible();
		expect(screen.getByText(familyLayoutCopy.loadingHelp)).toBeVisible();
		expect(status).toHaveAttribute("aria-live", "polite");
		expect(status).toHaveAttribute("aria-atomic", "true");
		expect(status).not.toHaveAttribute("aria-busy");
		expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
		expect(container.querySelector('[class*="skeleton" i]')).not.toBeInTheDocument();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
		expect(screen.queryByRole("heading")).not.toBeInTheDocument();
	});

	it.each(streamedPages)("uses the shared fallback in %s", (path) => {
		const source = readFileSync(resolve(process.cwd(), "src/app/(manager)", path), "utf8");
		expect(source).toContain("fallback={<ManagerLoading />}");
		expect(source).not.toMatch(/Skeleton/);
	});

	it.each(inheritedRoutes)("inherits loading instead of shadowing it in %s", (path) => {
		expect(existsSync(resolve(process.cwd(), "src/app/(manager)/family", path, "loading.tsx"))).toBe(false);
	});

	it("reserves content space and respects reduced motion without an overlay", () => {
		const css = readFileSync(resolve(process.cwd(), "src/features/family/components/ManagerLoading/ManagerLoading.module.css"), "utf8");
		expect(css).toContain("min-block-size:");
		expect(css).toContain("prefers-reduced-motion: reduce");
		expect(css).toContain("animation: none");
		expect(css).not.toMatch(/position:\s*(?:fixed|absolute)/);
	});
});

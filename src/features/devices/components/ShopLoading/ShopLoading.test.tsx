import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ShopRouteLoading from "@/app/(device)/shop/loading";
import AssistantLoading from "@/app/(device)/shop/assistant/loading";
import ReviewLoading from "@/app/(device)/shop/assistant/review/loading";
import ProductsLoading from "@/app/(device)/shop/products/loading";
import BasketLoading from "@/app/(device)/shop/basket/loading";
import HistoryLoading from "@/app/(device)/shop/requests/loading";
import RequestDetailLoading from "@/app/(device)/shop/requests/[requestId]/loading";
import { assistantCopy } from "@/features/assistant/copy";
import { catalogCopy } from "@/features/catalog/copy";
import { requestsCopy } from "@/features/requests/copy";
import { devicesCopy } from "../../copy";
import { ShopLoading } from "./ShopLoading";
import styles from "./ShopLoading.module.css";

const routeLoaders = [
	["shop", ShopRouteLoading, devicesCopy.loadingShopping],
	["assistant", AssistantLoading, devicesCopy.loadingShopping],
	["review", ReviewLoading, assistantCopy.reviewLoading],
	["products", ProductsLoading, catalogCopy.loading],
	["basket", BasketLoading, devicesCopy.loadingShopping],
	["history", HistoryLoading, requestsCopy.loading],
	["detail", RequestDetailLoading, devicesCopy.loadingShopping],
] as const;

describe("simple shopping loading states", () => {
	it.each(routeLoaders)("shows a readable %s message without skeletons or fake controls", (_, Loading, label) => {
		const { container } = render(<Loading />);
		const status = screen.getByRole("status");

		expect(screen.getByText(label)).toBeVisible();
		expect(status).toHaveAttribute("aria-live", "polite");
		expect(status).toHaveAttribute("aria-atomic", "true");
		expect(status).not.toHaveAttribute("aria-busy");
		expect(status).toHaveTextContent(devicesCopy.loadingShoppingHelp);
		expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
		expect(container.querySelector('[aria-hidden="true"]')).toHaveClass(styles.spinner);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
		expect(screen.queryByRole("heading")).not.toBeInTheDocument();
		expect(screen.queryByRole("main")).not.toBeInTheDocument();
	});

	it("allows a page-specific message without repeating the generic message", () => {
		render(<ShopLoading label={catalogCopy.loading} />);
		expect(screen.getByRole("status")).toHaveTextContent(catalogCopy.loading);
		expect(screen.queryByText(devicesCopy.loadingShopping)).not.toBeInTheDocument();
	});

	it.each([
		"layout.tsx", "assistant/page.tsx", "assistant/review/page.tsx", "products/page.tsx",
		"basket/page.tsx", "requests/page.tsx", "requests/[requestId]/page.tsx",
	])("keeps the %s streaming boundary on the same non-skeleton loader", (path) => {
		const source = readFileSync(resolve(process.cwd(), "src/app/(device)/shop", path), "utf8");
		expect(source).toContain("<Suspense fallback={");
		expect(source).toMatch(/<ShopLoading(?:\s+label=\{[^}]+\})?\s*\/>/);
		expect(source).not.toContain("Skeleton");
	});

	it("reserves loading space and stops the indicator when reduced motion is requested", () => {
		const source = readFileSync(resolve(process.cwd(), "src/features/devices/components/ShopLoading/ShopLoading.module.css"), "utf8");
		expect(source).toContain("min-block-size: calc(var(--control-height-lg) * 4)");
		expect(source).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.spinner\s*\{\s*animation: none;/);
	});
});

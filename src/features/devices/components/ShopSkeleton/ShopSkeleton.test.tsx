import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { devicesCopy } from "../../copy";
import { ShopSkeleton } from "./ShopSkeleton";

describe("shopping loading states", () => {
	it.each(["assistant", "basket", "history", "detail"] as const)(
		"announces %s loading without fake controls or additional landmarks",
		(variant) => {
			render(<ShopSkeleton variant={variant} />);
			expect(screen.getByRole("status")).toHaveTextContent(devicesCopy.loadingShopping);
			expect(screen.queryByRole("button")).not.toBeInTheDocument();
			expect(screen.queryByRole("link")).not.toBeInTheDocument();
			expect(screen.queryByRole("heading")).not.toBeInTheDocument();
			expect(screen.queryByRole("main")).not.toBeInTheDocument();
		},
	);

	it("uses the assistant loading shape at the shop entry", () => {
		const view = render(<ShopSkeleton />);
		const entryShape = view.container.innerHTML;
		view.rerender(<ShopSkeleton variant="assistant" />);
		expect(view.container.innerHTML).toBe(entryShape);
	});
});

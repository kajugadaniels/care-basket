import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { devicesCopy } from "../../copy";
import { ShopSkeleton } from "./ShopSkeleton";

describe("shopping loading states", () => {
	it.each(["home", "assistant", "basket", "history", "detail"] as const)(
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
});

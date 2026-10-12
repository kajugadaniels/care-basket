import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductCard } from "./ProductCard";
import type { CatalogProductDto } from "../../types";

const product: CatalogProductDto = { sku: "example-rice", displayName: "Example Rice", category: "PANTRY", sizeLabel: "1 lb (454 g)", imagePath: null };

describe("read-only product card", () => {
	it("has an accessible product name and decorative fallback without pretend actions or prices", () => {
		render(<ProductCard product={product} />);
		expect(screen.getByRole("article", { name: "Example Rice" })).toBeInTheDocument();
		expect(screen.getByText("1 lb (454 g)")).toBeInTheDocument();
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		expect(screen.queryByText("Price")).not.toBeInTheDocument();
	});
	it("uses a locally served image with product and size alternative text", () => {
		render(<ProductCard product={{ ...product, imagePath: "/products/example-rice.jpg" }} />);
		const image = screen.getByRole("img", { name: "Example Rice, 1 lb (454 g)" });
		expect(image.getAttribute("src")).toContain("example-rice.jpg");
		expect(image).toHaveAttribute("loading", "lazy");
	});
	it("never renders manager-only prices even if extra fields reach the card", () => {
		const productWithExtraFields = { ...product, demoPrice: { priceMinor: 349, currency: "USD" }, brand: "Example" };
		render(<ProductCard product={productWithExtraFields} />);
		expect(screen.queryByText("Price")).not.toBeInTheDocument();
		expect(screen.queryByText("$3.49")).not.toBeInTheDocument();
		expect(screen.queryByText("Example")).not.toBeInTheDocument();
	});
});

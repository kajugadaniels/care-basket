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
		expect(screen.queryByText(/Demo price/)).not.toBeInTheDocument();
	});
	it("uses a locally served image with product and size alternative text", () => {
		render(<ProductCard product={{ ...product, imagePath: "/products/example-rice.jpg" }} />);
		const image = screen.getByRole("img", { name: "Example Rice, 1 lb (454 g)" });
		expect(image.getAttribute("src")).toContain("example-rice.jpg");
		expect(image).toHaveAttribute("loading", "lazy");
	});
	it("labels manager money as demo price and attributes licensed images", () => {
		render(<ProductCard product={{ ...product, brand: "Example", demoPrice: { priceMinor: 349, currency: "USD" }, attribution: "Example source, ODbL", imageAttribution: "Open Food Facts contributors", imageSourceUrl: "https://images.openfoodfacts.org/example.400.jpg", imageProductUrl: "https://world.openfoodfacts.org/product/012345678905" }} />);
		expect(screen.getByText("Demo price")).toBeInTheDocument();
		expect(screen.getByText("$3.49")).toBeInTheDocument();
		expect(screen.getByText("Rice & Pantry")).toBeInTheDocument();
		expect(screen.getByText("Example")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "CC BY-SA 3.0" })).toHaveAttribute("href", "https://creativecommons.org/licenses/by-sa/3.0/");
	});
});

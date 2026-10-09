import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import DataSourcesPage from "./page";

describe("public catalog attribution", () => {
	it("offers the derivative database and explains simulated prices and image licensing", () => {
		render(<DataSourcesPage />);
		expect(screen.getByRole("heading", { level: 1, name: "Data sources" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Download or reuse the curated catalog" })).toHaveAttribute("href", "https://github.com/kajugadaniels/care-basket/blob/main/prisma/catalog/catalog.us.json");
		expect(screen.getByText(/CareBasket Demo Market is simulated/)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "CC BY-SA 3.0" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Included product image attribution" })).toHaveAttribute("href", "/products/ATTRIBUTION.md");
	});
});

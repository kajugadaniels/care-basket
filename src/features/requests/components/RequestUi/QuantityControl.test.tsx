import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QuantityControl } from "./QuantityControl";
import { requestsCopy } from "../../copy";
describe("bounded quantity controls", () => {
	it("disables increases at the suggestion-specific maximum", () => {
		render(<QuantityControl name="Milk" quantity={6} maxQuantity={6} onChange={vi.fn()} />);
		expect(screen.getByRole("button", { name: requestsCopy.increase("Milk") })).toBeDisabled();
	});
	it("preserves the requested-item default cap and allows deliberate quantity changes", () => {
		const change = vi.fn(); render(<QuantityControl name="Milk" quantity={2} onChange={change} />);
		fireEvent.click(screen.getByRole("button", { name: requestsCopy.increase("Milk") }));
		expect(change).toHaveBeenCalledWith(3);
	});
});

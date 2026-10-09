import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
	it("is a native checkbox named by its visible label", () => {
		const onChange = vi.fn();
		render(<Checkbox name="consent" label="I agree" checked={false} onChange={onChange} />);

		const checkbox = screen.getByRole("checkbox", { name: "I agree" });
		expect(checkbox).toHaveAttribute("name", "consent");
		expect(checkbox).not.toBeChecked();

		fireEvent.click(screen.getByText("I agree"));
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it("describes the checkbox with its hint and error", () => {
		render(<Checkbox name="consent" label="I agree" hint="Only you can confirm this." error="Confirm to continue." />);

		const checkbox = screen.getByRole("checkbox", { name: "I agree" });
		expect(checkbox).toHaveAccessibleDescription("Only you can confirm this. Confirm to continue.");
		expect(checkbox).toHaveAttribute("aria-invalid", "true");
	});

	it("keeps a plain checkbox valid and undescribed", () => {
		render(<Checkbox name="confirmed" label="I confirm" />);

		const checkbox = screen.getByRole("checkbox", { name: "I confirm" });
		expect(checkbox).not.toHaveAttribute("aria-invalid");
		expect(checkbox).not.toHaveAttribute("aria-describedby");
	});
});

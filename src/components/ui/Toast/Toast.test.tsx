import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Toast } from "./Toast";

describe("success toast", () => {
	afterEach(() => vi.restoreAllMocks());
	it("keeps a polite empty live region ready without exposing a dismiss control", () => {
		render(<Toast notice={null} dismissLabel="Dismiss success message" onDismiss={vi.fn()} />);
		expect(screen.getByRole("status")).toBeEmptyDOMElement();
		expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("announces confirmed success without moving focus and offers dismissal", () => {
		const dismiss = vi.fn();
		const { rerender } = render(<><button>Save quantity</button><Toast notice={null} dismissLabel="Dismiss success message" onDismiss={dismiss} /></>);
		const save = screen.getByRole("button", { name: "Save quantity" });
		save.focus();
		rerender(<><button>Save quantity</button><Toast notice={{ id: 1, message: "Milk quantity saved." }} dismissLabel="Dismiss success message" onDismiss={dismiss} /></>);
		expect(screen.getByRole("status")).toHaveTextContent("Milk quantity saved.");
		expect(save).toHaveFocus();
		const close = screen.getByRole("button", { name: "Dismiss success message" });
		close.focus();
		expect(close).toHaveFocus();
		fireEvent.click(close);
		expect(dismiss).toHaveBeenCalledOnce();
		expect(save).toHaveFocus();
	});

	it("repositions a toast that overlaps the focused control", () => {
		const { rerender } = render(<><button>Save quantity</button><Toast notice={null} dismissLabel="Dismiss success message" onDismiss={vi.fn()} /></>);
		const save = screen.getByRole("button", { name: "Save quantity" });
		save.focus();
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
			if (this === save) return new DOMRect(100, 400, 150, 48);
			return this.dataset.position === "top" ? new DOMRect(100, 20, 300, 80) : new DOMRect(100, 390, 300, 80);
		});
		rerender(<><button>Save quantity</button><Toast notice={{ id: 1, message: "Milk quantity saved." }} dismissLabel="Dismiss success message" onDismiss={vi.fn()} /></>);
		expect(screen.getByRole("status").parentElement).toHaveAttribute("data-position", "top");
		expect(save).toHaveFocus();
	});

	it("updates the message for successive confirmations in the same live region", () => {
		const { rerender } = render(<Toast notice={{ id: 1, message: "Milk quantity saved." }} dismissLabel="Dismiss success message" onDismiss={vi.fn()} />);
		const region = screen.getByRole("status");
		rerender(<Toast notice={{ id: 2, message: "Bread quantity saved." }} dismissLabel="Dismiss success message" onDismiss={vi.fn()} />);
		expect(screen.getByRole("status")).toBe(region);
		expect(region).toHaveTextContent("Bread quantity saved.");
	});
});

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
const fake = vi.hoisted(() => ({ text: vi.fn() }));
vi.mock("../../actions", () => ({ interpretTextAction: fake.text }));
vi.mock("../ProposalReview/ProposalReview", () => ({ ProposalReview: () => <p>Review</p> }));
import { AssistantStart } from "./AssistantStart";
import { assistantCopy as copy } from "../../copy";
describe("assistant entry", () => {
	it("keeps typing and pictures available and hides unavailable voice", () => {
		render(<AssistantStart voice={false} child={false} />);
		expect(screen.queryByRole("button", { name: copy.speak })).not.toBeInTheDocument();
		expect(screen.getByText(copy.local)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: copy.pictures })).toHaveAttribute("href", "/shop/products");
	});
	it("marks the chosen input method without requesting microphone access", () => {
		render(<AssistantStart voice={false} child />);
		const type = screen.getByRole("button", { name: copy.type });
		expect(type).toHaveAttribute("aria-pressed", "true");
		fireEvent.click(screen.getByRole("button", { name: copy.cancel }));
		expect(type).toHaveAttribute("aria-pressed", "false");
		fireEvent.click(type);
		expect(type).toHaveAttribute("aria-pressed", "true");
		expect(screen.getByRole("textbox", { name: copy.prompt })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: copy.speak })).not.toBeInTheDocument();
	});
	it("retains typed input and focuses a calm error after transport failure", async () => {
		fake.text.mockRejectedValue(new Error("offline")); render(<AssistantStart voice={false} child={false} />);
		fireEvent.click(screen.getByRole("button", { name: copy.type }));
		const input = screen.getByRole("textbox", { name: copy.prompt }); fireEvent.change(input, { target: { value: "milk" } });
		fireEvent.click(screen.getByRole("button", { name: copy.continue }));
		expect(await screen.findByRole("alert")).toHaveFocus(); expect(input).toHaveValue("milk");
	});
});

import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DraftProvider, useDraft } from "@/features/requests/components/DraftProvider/DraftProvider";
import { assistantCopy as copy } from "../../copy";
import type { Proposal } from "../../types";
import { AssistantProvider, useAssistant } from "../AssistantProvider/AssistantProvider";
import { AssistantStart } from "../AssistantStart/AssistantStart";
import { ProposalReviewScreen } from "./ProposalReviewScreen";

const fake = vi.hoisted(() => ({ push: vi.fn(), text: vi.fn(), budget: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: fake.push }) }));
vi.mock("../../actions", () => ({ interpretTextAction: fake.text, estimateShoppingBudgetAction: fake.budget }));

const proposal: Proposal = {
	inputMode: "TEXT", inputText: "milk", budgetMinor: null, local: true,
	items: [{ sku: "demo-milk", displayName: "Milk", category: "DAIRY_EGGS", sizeLabel: "1 litre",
		imagePath: null, quantity: 1, origin: "REQUESTED", uncertain: false, isSubstitute: false, substitutionNote: null }],
	questions: [], unrecognized: [],
};

function Flow({ child }: { child: boolean }) {
	const [review, setReview] = useState(true);
	const { setProposal } = useAssistant();
	const { draft } = useDraft();

	return (
		<>
			<button onClick={() => setProposal(proposal)}>Load proposal</button>
			<button onClick={() => setReview(false)}>Open entry</button>
			<button onClick={() => setReview(true)}>Open review</button>
			{review ? <ProposalReviewScreen child={child} /> : <AssistantStart voice={false} child={child} />}
			<output aria-label="Draft quantity">{draft.items[0]?.quantity ?? 0}</output>
		</>
	);
}

function open(child = false) {
	render(<DraftProvider><AssistantProvider><Flow child={child} /></AssistantProvider></DraftProvider>);
}

describe("separate proposal review screen", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		fake.text.mockResolvedValue({ ok: true, data: proposal });
	});

	it("offers recovery when opened directly or after a full reload", () => {
		open();
		expect(screen.getByRole("heading", { level: 1, name: copy.emptyReview })).toHaveFocus();
		expect(screen.getByRole("link", { name: copy.startAgain })).toHaveAttribute("href", "/shop/assistant");
		expect(screen.getByRole("link", { name: copy.pictures })).toHaveAttribute("href", "/shop/products");
		expect(screen.queryByRole("button", { name: copy.accept })).not.toBeInTheDocument();
	});

	it("keeps input and the proposal when entry and review unmount during navigation", async () => {
		open();
		fireEvent.click(screen.getByRole("button", { name: "Open entry" }));
		fireEvent.change(screen.getByRole("textbox", { name: copy.prompt }), { target: { value: "milk" } });
		fireEvent.click(screen.getByRole("button", { name: copy.continue }));
		await waitFor(() => expect(fake.push).toHaveBeenCalledWith("/shop/assistant/review"));
		fireEvent.click(screen.getByRole("button", { name: "Open review" }));
		expect(screen.getByRole("heading", { level: 1, name: copy.review })).toHaveFocus();
		expect(screen.getByRole("checkbox")).toBeChecked();
		expect(screen.getByLabelText("Draft quantity")).toHaveTextContent("0");
		fireEvent.click(screen.getByRole("button", { name: "Open entry" }));
		expect(screen.getByRole("textbox", { name: copy.prompt })).toHaveValue("milk");
	});

	it("consumes the proposal only after confirmation so returning cannot add it twice", () => {
		open(true);
		fireEvent.click(screen.getByRole("button", { name: "Load proposal" }));
		expect(screen.getByLabelText("Draft quantity")).toHaveTextContent("0");
		fireEvent.click(screen.getByRole("button", { name: copy.accept }));
		expect(fake.push).toHaveBeenCalledWith("/shop/basket");
		expect(screen.getByLabelText("Draft quantity")).toHaveTextContent("1");
		expect(screen.getByRole("heading", { name: copy.emptyReview })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: copy.accept })).not.toBeInTheDocument();
	});

	it("resets choices for a fresh interpretation with identical words", () => {
		open(true);
		fireEvent.click(screen.getByRole("button", { name: "Load proposal" }));
		fireEvent.click(screen.getByRole("checkbox"));
		expect(screen.getByRole("button", { name: copy.accept })).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "Load proposal" }));
		expect(screen.getByRole("checkbox")).toBeChecked();
		expect(screen.getByRole("button", { name: copy.accept })).toBeEnabled();
	});
});

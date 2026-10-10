import { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DraftProvider, useDraft } from "@/features/requests/components/DraftProvider/DraftProvider";
import { requestsCopy } from "@/features/requests/copy";
import { assistantCopy as copy } from "../../copy";
import type { Proposal } from "../../types";
import { AssistantProvider, useAssistant } from "../AssistantProvider/AssistantProvider";
import { AssistantStart } from "../AssistantStart/AssistantStart";
import { ProposalReviewScreen } from "./ProposalReviewScreen";
import styles from "./ProposalReview.module.css";

const fake = vi.hoisted(() => ({ push: vi.fn(), text: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: fake.push }) }));
vi.mock("../../actions", () => ({ interpretTextAction: fake.text }));

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
			{review ? <ProposalReviewScreen /> : <AssistantStart voice={false} child={child} />}
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
		expect(screen.queryByRole("button", { name: copy.basket })).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: copy.none })).not.toBeInTheDocument();
	});

	it("puts the title and both navigation choices in one header row", () => {
		open(true);
		fireEvent.click(screen.getByRole("button", { name: "Load proposal" }));
		const heading = screen.getByRole("heading", { level: 1, name: copy.review });
		const row = heading.parentElement!;
		expect(row).toHaveClass(styles.headerRow);
		expect(within(row).getByRole("link", { name: copy.backToAssistant })).toHaveAttribute("href", "/shop/assistant");
		expect(within(row).getByRole("link", { name: copy.none })).toHaveAttribute("href", "/shop/products");
		expect(screen.getAllByRole("link", { name: copy.backToAssistant })).toHaveLength(1);
		expect(screen.getAllByRole("link", { name: copy.none })).toHaveLength(1);
	});

	it("keeps input and the proposal when entry and review unmount during navigation", async () => {
		open();
		fireEvent.click(screen.getByRole("button", { name: "Open entry" }));
		fireEvent.change(screen.getByRole("textbox", { name: copy.prompt }), { target: { value: "milk" } });
		fireEvent.click(screen.getByRole("button", { name: copy.continue }));
		await waitFor(() => expect(fake.push).toHaveBeenCalledWith("/shop/assistant/review"));
		fireEvent.click(screen.getByRole("button", { name: "Open review" }));
		expect(screen.getByRole("heading", { level: 1, name: copy.review })).toHaveFocus();
		expect(screen.getByRole("button", { name: requestsCopy.add })).toBeEnabled();
		expect(screen.getByLabelText("Draft quantity")).toHaveTextContent("0");
		fireEvent.click(screen.getByRole("button", { name: "Open entry" }));
		expect(screen.getByRole("textbox", { name: copy.prompt })).toHaveValue("milk");
	});

	it("keeps the proposal after adding and consumes it only when opening the basket", () => {
		open(true);
		fireEvent.click(screen.getByRole("button", { name: "Load proposal" }));
		expect(screen.getByLabelText("Draft quantity")).toHaveTextContent("0");
		fireEvent.click(screen.getByRole("button", { name: requestsCopy.add }));
		expect(screen.getByLabelText("Draft quantity")).toHaveTextContent("1");
		expect(screen.getByRole("heading", { name: copy.review })).toBeInTheDocument();
		expect(fake.push).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: copy.basket }));
		expect(fake.push).toHaveBeenCalledWith("/shop/basket");
		expect(screen.getByLabelText("Draft quantity")).toHaveTextContent("1");
		expect(screen.getByRole("heading", { name: copy.emptyReview })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: copy.basket })).not.toBeInTheDocument();
	});

	it("resets unadded quantities for a fresh interpretation with identical words", () => {
		open(true);
		fireEvent.click(screen.getByRole("button", { name: "Load proposal" }));
		fireEvent.click(screen.getByRole("button", { name: requestsCopy.increase("Milk") }));
		expect(screen.getByText("Quantity: 2")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Load proposal" }));
		expect(screen.getByText("Quantity: 1")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: copy.basket })).toBeDisabled();
		expect(screen.getByLabelText("Draft quantity")).toHaveTextContent("0");
	});

	it("keeps added items across review navigation without offering a duplicate add", () => {
		open();
		fireEvent.click(screen.getByRole("button", { name: "Load proposal" }));
		fireEvent.click(screen.getByRole("button", { name: requestsCopy.add }));
		fireEvent.click(screen.getByRole("button", { name: "Open entry" }));
		fireEvent.click(screen.getByRole("button", { name: "Open review" }));
		expect(screen.getByLabelText("Draft quantity")).toHaveTextContent("1");
		expect(screen.queryByRole("button", { name: requestsCopy.add })).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: `${requestsCopy.remove}: Milk` })).toBeEnabled();
	});
});

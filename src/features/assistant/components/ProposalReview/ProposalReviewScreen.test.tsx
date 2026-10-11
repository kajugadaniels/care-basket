import { useState } from "react";
import { readFileSync } from "node:fs";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DraftProvider, useDraft } from "@/features/requests/components/DraftProvider/DraftProvider";
import { requestsCopy } from "@/features/requests/copy";
import { ShopShell } from "@/features/devices/components/ShopShell/ShopShell";
import { devicesCopy } from "@/features/devices/copy";
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
			<button onClick={() => setProposal(null)}>Clear proposal</button>
			<button onClick={() => setReview(false)}>Open entry</button>
			<button onClick={() => setReview(true)}>Open review</button>
			{review ? <ProposalReviewScreen /> : <AssistantStart voice={false} child={child} />}
			<output aria-label="Draft quantity">{draft.items[0]?.quantity ?? 0}</output>
		</>
	);
}

function open(child = false) {
	render(<ShopShell><DraftProvider><AssistantProvider><Flow child={child} /></AssistantProvider></DraftProvider></ShopShell>);
}

describe("separate proposal review screen", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		fake.text.mockResolvedValue({ ok: true, data: proposal });
	});

	it("offers recovery when opened directly or after a full reload", () => {
		open();
		const empty = screen.getByRole("region", { name: copy.emptyReview });
		expect(empty).toHaveAccessibleDescription(copy.emptyReviewHelp);
		expect(empty).toHaveClass(styles.empty);
		expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
		expect(screen.getByRole("heading", { level: 1, name: copy.emptyReview })).toHaveFocus();
		expect(within(empty).getAllByRole("link")).toHaveLength(2);
		expect(within(empty).getByRole("link", { name: copy.startAgain })).toHaveAttribute("href", "/shop/assistant");
		expect(within(empty).getByRole("link", { name: copy.browseProducts })).toHaveAttribute("href", "/shop/products");
		expect(empty.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
		expect(empty.querySelector("svg")).toHaveAttribute("focusable", "false");
		expect(screen.queryByRole("button", { name: /check my list/i })).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: copy.backToAssistant })).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: copy.none })).not.toBeInTheDocument();
	});

	it("keeps empty-state actions responsive and icon motion opt-in", () => {
		const css = readFileSync(new URL("./ProposalReview.module.css", import.meta.url), "utf8");
		expect(css).toMatch(/\.emptyActions > a\s*\{[^}]*inline-size: 100%;[^}]*white-space: normal;/);
		expect(css).toMatch(/@media \(min-width: 40rem\)[\s\S]*\.emptyActions > a\s*\{[^}]*inline-size: auto;/);
		expect(css).toMatch(/@media \(prefers-reduced-motion: no-preference\)\s*\{[\s\S]*transition: transform var\(--duration-base\)/);
		expect(css).toContain(".empty:has(.emptyActions a:focus-visible) .emptyIcon");
		expect(css).toContain("(hover: hover) and (pointer: fine)");
		expect(css).not.toContain("@keyframes");
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

	it("keeps the proposal after adding and leaves list navigation in the top bar", () => {
		open(true);
		fireEvent.click(screen.getByRole("button", { name: "Load proposal" }));
		expect(screen.getByLabelText("Draft quantity")).toHaveTextContent("0");
		fireEvent.click(screen.getByRole("button", { name: requestsCopy.add }));
		expect(screen.getByLabelText("Draft quantity")).toHaveTextContent("1");
		expect(screen.getByRole("heading", { name: copy.review })).toBeInTheDocument();
		expect(fake.push).not.toHaveBeenCalled();
		const navigation = screen.getByRole("navigation", { name: devicesCopy.shopNav });
		expect(within(navigation).getByRole("link", { name: devicesCopy.shopList })).toHaveAttribute("href", "/shop/basket");
		expect(screen.queryByRole("button", { name: /check my list/i })).not.toBeInTheDocument();
	});

	it("focuses the recovery heading without clearing added groceries when the proposal is cleared", () => {
		open();
		fireEvent.click(screen.getByRole("button", { name: "Load proposal" }));
		fireEvent.click(screen.getByRole("button", { name: requestsCopy.add }));
		fireEvent.click(screen.getByRole("button", { name: "Clear proposal" }));
		expect(screen.getByLabelText("Draft quantity")).toHaveTextContent("1");
		expect(screen.getByRole("heading", { name: copy.emptyReview })).toHaveFocus();
		expect(screen.getByRole("link", { name: devicesCopy.shopList })).toHaveAttribute("href", "/shop/basket");
		expect(fake.push).not.toHaveBeenCalled();
	});

	it("resets unadded quantities for a fresh interpretation with identical words", () => {
		open(true);
		fireEvent.click(screen.getByRole("button", { name: "Load proposal" }));
		fireEvent.click(screen.getByRole("button", { name: requestsCopy.increase("Milk") }));
		expect(screen.getByText("Quantity: 2")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Load proposal" }));
		expect(screen.getByText("Quantity: 1")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /check my list/i })).not.toBeInTheDocument();
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

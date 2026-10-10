import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { assistantCatalog } from "@/test/factories/assistant";
import { requestIds } from "@/test/factories/requests";
import { DraftProvider, useDraft } from "@/features/requests/components/DraftProvider/DraftProvider";
import type { Draft } from "@/features/requests/draft";
import { requestsCopy } from "@/features/requests/copy";
import { displayItem } from "../../server/grounding";
import { assistantCopy as copy } from "../../copy";
import type { Proposal } from "../../types";
import { ProposalReview } from "./ProposalReview";
import cardStyles from "@/features/requests/components/RequestUi/RequestUi.module.css";

const fake = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: fake.push }) }));
const proposal: Proposal = { inputMode: "TEXT", inputText: "milk", local: true, sourceProof: requestIds.key,
	budgetMinor: null, items: [displayItem(assistantCatalog[0], 1, "REQUESTED"), displayItem(assistantCatalog[1], 1, "SUGGESTED")],
	questions: [], unrecognized: [] };

function DraftState() {
	const { draft, begin } = useDraft();
	return <>
		<output aria-label="Draft state">{JSON.stringify(draft)}</output>
		<button onClick={() => begin()}>Lock draft</button>
	</>;
}

function review(value = proposal) {
	render(<DraftProvider><ProposalReview proposal={value} /><DraftState /></DraftProvider>);
}

function draft(): Draft {
	return JSON.parse(screen.getByLabelText("Draft state").textContent!);
}

function card(name: string) {
	return within(screen.getByRole("article", { name }).parentElement!);
}

describe("explicit proposal review", () => {
	beforeEach(() => { vi.resetAllMocks(); });

	it("adds only the clicked product and opens the basket without adding it twice", () => {
		review();
		expect(screen.getByRole("heading", { name: copy.suggested })).toBeInTheDocument();
		expect(draft().items).toEqual([]);
		expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: copy.basket })).toBeDisabled();
		fireEvent.click(card("Milk").getByRole("button", { name: requestsCopy.increase("Milk") }));
		fireEvent.click(card("Milk").getByRole("button", { name: requestsCopy.add }));
		expect(draft().items).toEqual([expect.objectContaining({ sku: "demo-milk", quantity: 2, origin: "REQUESTED" })]);
		expect(screen.getByText(requestsCopy.added("Milk"))).toBeInTheDocument();
		expect(card("Bread").getByRole("button", { name: requestsCopy.add })).toBeEnabled();
		expect(fake.push).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: copy.basket }));
		expect(fake.push).toHaveBeenCalledWith("/shop/basket");
		expect(draft().items[0].quantity).toBe(2);
	});

	it("preserves suggestion proof, substitution and input provenance on explicit add", () => {
		const suggestion = { ...proposal.items[1], proof: "reviewed-suggestion-proof", uncertain: true,
			isSubstitute: true, substitutionNote: copy.substitution };
		review({ ...proposal, items: [proposal.items[0], suggestion], inputMode: "VOICE" });
		expect(screen.getByText(copy.substitution)).toBeInTheDocument();
		expect(screen.getByText(copy.uncertain)).toBeInTheDocument();
		fireEvent.click(card("Bread").getByRole("button", { name: requestsCopy.add }));
		expect(draft()).toMatchObject({ inputMode: "VOICE", inputText: "milk", sourceProof: requestIds.key,
			items: [{ sku: "demo-bread", origin: "SUGGESTED", proof: suggestion.proof,
				isSubstitute: true, substitutionNote: copy.substitution }] });
		expect(fake.push).not.toHaveBeenCalled();
	});

	it("shares catalog quantity limits before and after adding and allows removal", () => {
		review({ ...proposal, items: [{ ...proposal.items[0], quantity: 19 }, { ...proposal.items[1], quantity: 5 }] });
		for (const [name, maximum] of [["Milk", 20], ["Bread", 6]] as const) {
			const controls = card(name);
			fireEvent.click(controls.getByRole("button", { name: requestsCopy.increase(name) }));
			expect(controls.getByText(`Quantity: ${maximum}`)).toBeInTheDocument();
			expect(controls.getByRole("button", { name: requestsCopy.increase(name) })).toBeDisabled();
			fireEvent.click(controls.getByRole("button", { name: requestsCopy.add }));
			expect(controls.queryByRole("button", { name: requestsCopy.add })).not.toBeInTheDocument();
			expect(controls.getByRole("button", { name: requestsCopy.increase(name) })).toBeDisabled();
			fireEvent.click(controls.getByRole("button", { name: requestsCopy.decrease(name) }));
			expect(controls.getByText(`Quantity: ${maximum - 1}`)).toBeInTheDocument();
			fireEvent.click(controls.getByRole("button", { name: `${requestsCopy.remove}: ${name}` }));
			expect(controls.getByRole("button", { name: requestsCopy.add })).toBeEnabled();
		}
		expect(draft().items).toEqual([]);
		expect(screen.getByRole("button", { name: copy.basket })).toBeDisabled();
	});

	it.each([null, 2000])("does not show or apply proposed budget %s", (budgetMinor) => {
		review({ ...proposal, budgetMinor });
		expect(screen.queryByText("Budget for this list")).not.toBeInTheDocument();
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Use this budget" })).not.toBeInTheDocument();
		fireEvent.click(card("Milk").getByRole("button", { name: requestsCopy.add }));
		expect(draft().budgetMinor).toBeUndefined();
		expect(draft().budgetConfirmed).toBeUndefined();
		expect(screen.getByRole("button", { name: copy.basket })).toBeEnabled();
	});

	it("adds a clarification with its quantity and focuses the next question", () => {
		review({ ...proposal, questions: [
			{ question: "Choose milk", options: proposal.items },
			{ question: "Choose bread", options: [proposal.items[1], displayItem(assistantCatalog[2], 1, "REQUESTED")] },
		] });
		expect(screen.getByRole("heading", { name: "Choose milk" })).toBeInTheDocument();
		expect(screen.queryByRole("heading", { name: "Choose bread" })).not.toBeInTheDocument();
		expect(screen.getAllByRole("article", { name: "Milk" })).toHaveLength(1);
		const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
		expect(new Set(ids).size).toBe(ids.length);
		fireEvent.click(card("Milk").getByRole("button", { name: requestsCopy.increase("Milk") }));
		fireEvent.click(card("Milk").getByRole("button", { name: requestsCopy.add }));
		expect(draft().items[0]).toMatchObject({ sku: "demo-milk", quantity: 2 });
		expect(screen.getByRole("heading", { name: "Choose bread" })).toHaveFocus();
		expect(fake.push).not.toHaveBeenCalled();
	});

	it("can choose an already-added clarification without increasing its quantity", () => {
		review({ ...proposal, items: [], questions: [
			{ question: "First choice", options: proposal.items },
			{ question: "Second choice", options: proposal.items },
		] });
		fireEvent.click(card("Milk").getByRole("button", { name: requestsCopy.add }));
		expect(screen.getByRole("heading", { name: "Second choice" })).toHaveFocus();
		fireEvent.click(card("Milk").getByRole("button", { name: copy.chooseLabel({ name: "Milk", size: "1 litre" }) }));
		expect(screen.queryByRole("heading", { name: "Second choice" })).not.toBeInTheDocument();
		expect(draft().items).toHaveLength(1);
		expect(draft().items[0].quantity).toBe(1);
		expect(card("Milk").getByRole("button", { name: `${requestsCopy.remove}: Milk` })).toBeEnabled();
		fireEvent.click(card("Milk").getByRole("button", { name: requestsCopy.increase("Milk") }));
		expect(draft().items[0].quantity).toBe(2);
	});

	it("keeps a rejected suggestion visible and focuses a readable limit error", () => {
		const suggestions = Array.from({ length: 13 }, (_, index) => ({
			...proposal.items[1], sku: `suggested-${index}`, displayName: `Idea ${index}`,
		}));
		review({ ...proposal, items: suggestions });
		for (let index = 0; index < 12; index++) {
			fireEvent.click(card(`Idea ${index}`).getByRole("button", { name: requestsCopy.add }));
		}
		fireEvent.click(card("Idea 12").getByRole("button", { name: requestsCopy.add }));
		expect(screen.getByRole("alert")).toHaveTextContent(copy.addError);
		expect(screen.getByRole("alert")).toHaveFocus();
		expect(draft().items).toHaveLength(12);
		expect(card("Idea 12").getByRole("button", { name: requestsCopy.add })).toBeEnabled();
	});

	it("locks quantity, add, remove and navigation while the draft is submitting", () => {
		review();
		fireEvent.click(card("Milk").getByRole("button", { name: requestsCopy.add }));
		fireEvent.click(screen.getByRole("button", { name: "Lock draft" }));
		for (const name of ["Milk", "Bread"]) {
			expect(card(name).getByRole("button", { name: requestsCopy.increase(name) })).toBeDisabled();
			expect(card(name).getByRole("button", { name: requestsCopy.decrease(name) })).toBeDisabled();
		}
		expect(card("Milk").getByRole("button", { name: `${requestsCopy.remove}: Milk` })).toBeDisabled();
		expect(card("Bread").getByRole("button", { name: requestsCopy.add })).toBeDisabled();
		expect(screen.getByRole("button", { name: copy.basket })).toBeDisabled();
	});

	it("keeps the catalog card layout without the removed notices or checkbox controls", () => {
		review();
		expect(screen.queryByText("We matched your words to groceries. Check the sizes.")).not.toBeInTheDocument();
		expect(screen.queryByText("Nothing is sent to your family yet.")).not.toBeInTheDocument();
		expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
		for (const name of ["Milk", "Bread"]) {
			expect(screen.getByRole("article", { name }).parentElement).toHaveClass(cardStyles.selection);
			expect(card(name).getByRole("button", { name: requestsCopy.add }).parentElement).toHaveClass(cardStyles.controls);
		}
		const sharedStyles = readFileSync(new URL("../../../requests/components/RequestUi/RequestUi.module.css", import.meta.url), "utf8");
		expect(sharedStyles).toMatch(/\.selection\s*\{[^}]*display: flex;[^}]*flex-direction: column;/);
		expect(sharedStyles).toMatch(/\.selection > article\s*\{[^}]*block-size: auto;/);
		expect(sharedStyles).toMatch(/\.selection \.controls\s*\{[^}]*margin-block-start: auto;/);
	});
});

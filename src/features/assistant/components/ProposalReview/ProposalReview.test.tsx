import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
import styles from "./ProposalReview.module.css";

const fake = vi.hoisted(() => ({ push: vi.fn(), page: vi.fn(), guide: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: fake.push }) }));
vi.mock("../../actions", () => ({ loadReviewProductsAction: fake.page, guideShoppingAction: fake.guide }));
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
	beforeEach(() => {
		vi.resetAllMocks();
		vi.stubGlobal("IntersectionObserver", class {
			observe = vi.fn();
			disconnect = vi.fn();
		});
	});
	afterEach(() => vi.unstubAllGlobals());

	it("adds only the clicked product and updates the shopping-list summary", () => {
		review();
		expect(screen.getByRole("heading", { name: copy.suggested })).toBeInTheDocument();
		expect(screen.queryByRole("heading", { name: copy.guideTitle })).not.toBeInTheDocument();
		expect(screen.getByRole("complementary", { name: requestsCopy.detailTitle })).toBeInTheDocument();
		expect(draft().items).toEqual([]);
		expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: requestsCopy.basket })).not.toBeInTheDocument();
		fireEvent.click(card("Milk").getByRole("button", { name: requestsCopy.increase("Milk") }));
		fireEvent.click(card("Milk").getByRole("button", { name: requestsCopy.add }));
		expect(draft().items).toEqual([expect.objectContaining({ sku: "demo-milk", quantity: 2, origin: "REQUESTED" })]);
		expect(screen.getByText(requestsCopy.added("Milk"))).toBeInTheDocument();
		expect(card("Bread").getByRole("button", { name: requestsCopy.add })).toBeEnabled();
		expect(fake.push).not.toHaveBeenCalled();
		expect(card("Milk").queryByRole("button", { name: requestsCopy.add })).not.toBeInTheDocument();
		expect(screen.getByRole("link", { name: requestsCopy.basket })).toHaveAttribute("href", "/shop/basket");
		expect(screen.getByText(requestsCopy.draftCount(1))).toBeInTheDocument();
		expect(draft().items).toHaveLength(1);
		expect(draft().items[0].quantity).toBe(2);
	});

	it("preserves suggestion proof, substitution and input provenance on explicit add", () => {
		const suggestion = { ...proposal.items[1], proof: "reviewed-suggestion-proof", uncertain: true,
			isSubstitute: true, substitutionNote: copy.substitution,
			suggestionReason: "An extra bakery idea based on this shopping request." };
		review({ ...proposal, items: [proposal.items[0], suggestion], inputMode: "VOICE" });
		expect(screen.getByText(copy.substitution)).toBeInTheDocument();
		expect(screen.getByText(copy.uncertain)).toBeInTheDocument();
		expect(screen.getByText(copy.whySuggested)).toBeInTheDocument();
		expect(screen.getByText(/An extra bakery idea/)).toBeInTheDocument();
		fireEvent.click(card("Bread").getByRole("button", { name: requestsCopy.add }));
		expect(draft()).toMatchObject({ inputMode: "VOICE", inputText: "milk", sourceProof: requestIds.key,
			items: [{ sku: "demo-bread", origin: "SUGGESTED", proof: suggestion.proof,
				isSubstitute: true, substitutionNote: copy.substitution,
				suggestionReason: suggestion.suggestionReason }] });
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
	});

	it.each([null, 2000])("does not show or apply proposed budget %s", (budgetMinor) => {
		review({ ...proposal, budgetMinor });
		expect(screen.queryByText("Budget for this list")).not.toBeInTheDocument();
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Use this budget" })).not.toBeInTheDocument();
		fireEvent.click(card("Milk").getByRole("button", { name: requestsCopy.add }));
		expect(draft().budgetMinor).toBeUndefined();
		expect(draft().budgetConfirmed).toBeUndefined();
	});

	it("shows all requested choices together without automatically choosing any", () => {
		review({ ...proposal, questions: [
			{ question: "Choose milk", options: proposal.items },
			{ question: "Choose bread", options: [proposal.items[1], displayItem(assistantCatalog[2], 1, "REQUESTED")] },
		] });
		expect(screen.getByRole("article", { name: "Milk" })).toBeInTheDocument();
		expect(screen.getByRole("article", { name: "Bread" })).toBeInTheDocument();
		expect(screen.getByRole("article", { name: "Rice" })).toBeInTheDocument();
		expect(draft().items).toEqual([]);
		expect(screen.getAllByRole("article", { name: "Milk" })).toHaveLength(1);
		const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
		expect(new Set(ids).size).toBe(ids.length);
		fireEvent.click(card("Milk").getByRole("button", { name: requestsCopy.increase("Milk") }));
		fireEvent.click(card("Milk").getByRole("button", { name: requestsCopy.add }));
		expect(draft().items[0]).toMatchObject({ sku: "demo-milk", quantity: 2 });
		expect(screen.getByRole("article", { name: "Bread" })).toBeInTheDocument();
		expect(fake.push).not.toHaveBeenCalled();
	});

	it("deduplicates overlapping choices without increasing already-added quantities", () => {
		review({ ...proposal, items: [], questions: [
			{ question: "First choice", options: proposal.items },
			{ question: "Second choice", options: proposal.items },
		] });
		fireEvent.click(card("Milk").getByRole("button", { name: requestsCopy.add }));
		expect(screen.getAllByRole("article", { name: "Milk" })).toHaveLength(1);
		expect(card("Milk").queryByRole("button", { name: requestsCopy.add })).not.toBeInTheDocument();
		expect(draft().items).toHaveLength(1);
		expect(draft().items[0].quantity).toBe(1);
		expect(card("Milk").getByRole("button", { name: `${requestsCopy.remove}: Milk` })).toBeEnabled();
		fireEvent.click(card("Milk").getByRole("button", { name: requestsCopy.increase("Milk") }));
		expect(draft().items[0].quantity).toBe(2);
	});

	it("keeps a rejected suggestion visible and focuses a readable limit error", async () => {
		const suggestions = Array.from({ length: 13 }, (_, index) => ({
			...proposal.items[1], sku: `suggested-${index}`, displayName: `Idea ${index}`,
		}));
		fake.page.mockResolvedValue({
			ok: true,
			data: { items: [suggestions[12]], nextCursor: null },
		});
		review({
			...proposal,
			items: suggestions.slice(0, 12),
			reviewId: requestIds.key,
			nextOffset: 12,
		});
		for (let index = 0; index < 12; index++) {
			fireEvent.click(card(`Idea ${index}`).getByRole("button", { name: requestsCopy.add }));
		}
		fireEvent.focus(screen.getByRole("region", { name: "More groceries load automatically" }));
		await screen.findByRole("article", { name: "Idea 12" });
		fireEvent.click(card("Idea 12").getByRole("button", { name: requestsCopy.add }));
		expect(screen.getByRole("alert")).toHaveTextContent(copy.addError);
		expect(screen.getByRole("alert")).toHaveFocus();
		expect(draft().items).toHaveLength(12);
		expect(card("Idea 12").getByRole("button", { name: requestsCopy.add })).toBeEnabled();
	});

	it("locks quantity, add and remove while the draft is submitting", () => {
		review();
		fireEvent.click(card("Milk").getByRole("button", { name: requestsCopy.add }));
		fireEvent.click(screen.getByRole("button", { name: "Lock draft" }));
		for (const name of ["Milk", "Bread"]) {
			expect(card(name).getByRole("button", { name: requestsCopy.increase(name) })).toBeDisabled();
			expect(card(name).getByRole("button", { name: requestsCopy.decrease(name) })).toBeDisabled();
		}
		expect(card("Milk").getByRole("button", { name: `${requestsCopy.remove}: Milk` })).toBeDisabled();
		expect(card("Bread").getByRole("button", { name: requestsCopy.add })).toBeDisabled();
		expect(screen.getByRole("link", { name: requestsCopy.basket })).toHaveAttribute("href", "/shop/basket");
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
		// Filesystem paths avoid Vite rewriting asset URLs to browser URLs.
		const sharedStyles = readFileSync(
			resolve("src/features/requests/components/RequestUi/RequestUi.module.css"),
			"utf8",
		);
		expect(sharedStyles).toMatch(/\.selection\s*\{[^}]*display: flex;[^}]*flex-direction: column;/);
		expect(sharedStyles).toMatch(/\.selection > article\s*\{[^}]*block-size: auto;/);
		expect(sharedStyles).toMatch(/\.selection \.controls\s*\{[^}]*margin-block-start: auto;/);
	});

	it("hides the list summary on phones and keeps it sticky beside products on wide screens", () => {
		review();
		const css = readFileSync(resolve("src/features/assistant/components/ProposalReview/ProposalReview.module.css"), "utf8");
		expect(css).toMatch(/\.listPanel\s*\{[^}]*display: none;/);
		expect(css).toMatch(/@media \(min-width: 48rem\)[\s\S]*\.listPanel\s*\{[^}]*display: grid;/);
		expect(css).toMatch(/@media \(min-width: 64rem\)[\s\S]*\.workspace\s*\{[^}]*grid-template-columns:/);
		expect(css).toMatch(/@media \(min-width: 64rem\)[\s\S]*\.listPanel\s*\{[^}]*display: grid;/);
		expect(css).toMatch(/@media \(min-width: 64rem\) and \(min-height: 32rem\)[\s\S]*\.listPanel\s*\{[^}]*position: sticky;/);
	});

	it("loads the next private batch without losing quantities, selection or provenance", async () => {
		fake.page.mockResolvedValue({ ok: true, data: {
			items: [{ ...displayItem(assistantCatalog[2], 1, "SUGGESTED"), proof: "next-page-proof" }], nextCursor: null,
		} });
		review({ ...proposal, reviewId: requestIds.key, nextOffset: 12 });
		fireEvent.click(card("Milk").getByRole("button", { name: requestsCopy.increase("Milk") }));
		fireEvent.click(card("Milk").getByRole("button", { name: requestsCopy.add }));
		expect(screen.queryByRole("button", { name: "Load more groceries" })).not.toBeInTheDocument();
		fireEvent.focus(screen.getByRole("region", { name: "More groceries load automatically" }));
		await screen.findByRole("article", { name: "Rice" });
		expect(fake.page).toHaveBeenCalledWith({ reviewId: requestIds.key, offset: 12 });
		expect(card("Milk").getByText("Quantity: 2")).toBeInTheDocument();
		expect(draft().items).toHaveLength(1);
		fireEvent.click(card("Rice").getByRole("button", { name: requestsCopy.add }));
		expect(draft().items[1]).toMatchObject({ sku: "demo-rice", origin: "SUGGESTED", proof: "next-page-proof" });
	});

	it("puts unmatched words directly beneath the grocery count without a separate section", () => {
		const phrases = ["paper towels", "soap"];
		review({ ...proposal, unrecognized: phrases });
		const count = screen.getByText("2 groceries on this page.");
		const message = screen.getByText(copy.unrecognized({ phrases }));
		expect(count.nextElementSibling).toBe(message);
		expect(message).toHaveClass(styles.unrecognized);
		expect(message.tagName).toBe("P");
		expect(screen.queryByRole("heading", { name: "I didn't catch these things." })).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: copy.pictures })).not.toBeInTheDocument();
		expect(screen.getByRole("heading", { name: copy.guideTitle })).toBeInTheDocument();
		expect(screen.getByRole("textbox", { name: copy.guideLabel })).toHaveValue(phrases[0]);
		const css = readFileSync(resolve("src/features/assistant/components/ProposalReview/ProposalReview.module.css"), "utf8");
		expect(css).toMatch(/\.unrecognized\s*\{[^}]*color: var\(--color-danger\);[^}]*font-size: var\(--text-md\);/);
	});

	it("keeps unmatched words visible beneath a zero count and renders them only as text", () => {
		const phrases = ["<img src=x onerror=alert(1)>"];
		review({ ...proposal, items: [], unrecognized: phrases });
		const count = screen.getByText("0 groceries on this page.");
		expect(count.nextElementSibling).toHaveTextContent(copy.unrecognized({ phrases }));
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
		expect(draft().items).toEqual([]);
	});
});

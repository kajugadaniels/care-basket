import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fireEvent, render, screen } from "@testing-library/react";
import { assistantCatalog } from "@/test/factories/assistant";
import { requestIds } from "@/test/factories/requests";
import { DraftProvider, useDraft } from "@/features/requests/components/DraftProvider/DraftProvider";
import { displayItem } from "../../server/grounding";
import { assistantCopy as copy } from "../../copy";
import type { Proposal } from "../../types";
const fake = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: fake.push }) }));
import { ProposalReview } from "./ProposalReview";
import cardStyles from "@/features/requests/components/RequestUi/RequestUi.module.css";
const proposal: Proposal = { inputMode: "TEXT", inputText: "milk", local: true, sourceProof: requestIds.key,
	budgetMinor: null, items: [displayItem(assistantCatalog[0], 1, "REQUESTED"), displayItem(assistantCatalog[1], 1, "SUGGESTED")], questions: [], unrecognized: [] };
function DraftBudget() {
	const { draft } = useDraft();
	return <output aria-label="Draft budget">{JSON.stringify({ budget: draft.budgetMinor ?? null, confirmed: draft.budgetConfirmed ?? false })}</output>;
}

function review(value = proposal) {
	render(<DraftProvider><ProposalReview proposal={value} /><DraftBudget /></DraftProvider>);
}
describe("explicit proposal review", () => {
	beforeEach(() => { vi.resetAllMocks(); });
	it("separates suggestions and never automatically selects or submits them", () => {
		review(); expect(screen.getByRole("heading", { name: copy.suggested })).toBeInTheDocument();
		const checks = screen.getAllByRole("checkbox"); expect(checks[0]).toBeChecked(); expect(checks[1]).not.toBeChecked();
		expect(fake.push).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: copy.accept })); expect(fake.push).toHaveBeenCalledWith("/shop/basket");
	});
	it.each([null, 2000])("removes budget controls without applying or blocking on proposed budget %s", (budgetMinor) => {
		review({ ...proposal, budgetMinor });
		expect(screen.queryByText("Budget for this list")).not.toBeInTheDocument();
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Use this budget" })).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: copy.accept })).toBeEnabled();
		fireEvent.click(screen.getByRole("button", { name: copy.accept }));
		expect(fake.push).toHaveBeenCalledWith("/shop/basket");
		expect(screen.getByLabelText("Draft budget")).toHaveTextContent('{"budget":null,"confirmed":false}');
	});
	it("shows one clarification at a time with catalog-styled cards", () => {
		review({ ...proposal, questions: [{ question: "Choose milk", options: proposal.items }, { question: "Choose bread", options: proposal.items }] });
		expect(screen.getByRole("heading", { name: "Choose milk" })).toBeInTheDocument();
		expect(screen.queryByRole("heading", { name: "Choose bread" })).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: copy.accept })).toBeDisabled();
		const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
		expect(new Set(ids).size).toBe(ids.length);
		const choice = screen.getByRole("button", { name: copy.chooseLabel({ name: "Milk", size: "1 litre" }) });
		expect(choice).toHaveTextContent(copy.chooseProduct);
		expect(choice.closest("li")).toHaveClass(cardStyles.selection);
		expect(choice.parentElement).toHaveClass(cardStyles.controls);
		fireEvent.click(choice);
		expect(screen.getByRole("heading", { name: "Choose bread" })).toHaveFocus();
	});
	it("removes the fallback and footer notice without removing confirmation", () => {
		review();
		expect(screen.queryByText("We matched your words to groceries. Check the sizes.")).not.toBeInTheDocument();
		expect(screen.queryByText("Nothing is sent to your family yet.")).not.toBeInTheDocument();
		expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: copy.accept })).toBeEnabled();
		for (const checkbox of screen.getAllByRole("checkbox")) {
			expect(checkbox.closest("li")).toHaveClass(cardStyles.selection);
		}
	});
	it("reserves natural-height space for cards and their choice controls", () => {
		const styles = readFileSync(new URL("./ProposalReview.module.css", import.meta.url), "utf8");
		const sharedStyles = readFileSync(new URL("../../../requests/components/RequestUi/RequestUi.module.css", import.meta.url), "utf8");
		expect(sharedStyles).toMatch(/\.selection\s*\{[^}]*display: flex;[^}]*flex-direction: column;/);
		expect(sharedStyles).toMatch(/\.selection > article\s*\{[^}]*block-size: auto;/);
		expect(sharedStyles).toMatch(/\.selection \.controls\s*\{[^}]*margin-block-start: auto;/);
		expect(styles).toMatch(/\.chooseButton\s*\{[^}]*white-space: normal;/);
		expect(styles).toMatch(/\.item \.check input\s*\{[^}]*min-block-size: var\(--space-5\);/);
	});
});

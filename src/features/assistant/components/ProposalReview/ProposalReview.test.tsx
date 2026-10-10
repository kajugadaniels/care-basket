import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { assistantCatalog } from "@/test/factories/assistant";
import { requestIds } from "@/test/factories/requests";
import { DraftProvider } from "@/features/requests/components/DraftProvider/DraftProvider";
import { displayItem } from "../../server/grounding";
import { assistantCopy as copy } from "../../copy";
import type { Proposal } from "../../types";
const fake = vi.hoisted(() => ({ push: vi.fn(), budget: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: fake.push }) }));
vi.mock("../../actions", () => ({ estimateShoppingBudgetAction: fake.budget }));
import { ProposalReview } from "./ProposalReview";
const proposal: Proposal = { inputMode: "TEXT", inputText: "milk", local: true, sourceProof: requestIds.key,
	budgetMinor: null, items: [displayItem(assistantCatalog[0], 1, "REQUESTED"), displayItem(assistantCatalog[1], 1, "SUGGESTED")], questions: [], unrecognized: [] };
function review(value = proposal, child = false) {
	render(<DraftProvider><ProposalReview proposal={value} child={child} onBack={vi.fn()} /></DraftProvider>);
}
describe("explicit proposal review", () => {
	beforeEach(() => { vi.resetAllMocks(); fake.budget.mockResolvedValue({ ok: true, data: { line: "About $2.50 with demo prices, within your $20.00." } }); });
	it("separates suggestions and never automatically selects or submits them", () => {
		review(); expect(screen.getByRole("heading", { name: copy.suggested })).toBeInTheDocument();
		const checks = screen.getAllByRole("checkbox"); expect(checks[0]).toBeChecked(); expect(checks[1]).not.toBeChecked();
		expect(fake.push).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: copy.accept })); expect(fake.push).toHaveBeenCalledWith("/shop/basket");
	});
	it("requires a deliberate budget confirmation before adding", async () => {
		review({ ...proposal, budgetMinor: 2000 });
		expect(screen.getByRole("button", { name: copy.accept })).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: copy.confirmBudget }));
		await waitFor(() => expect(screen.getByRole("button", { name: copy.accept })).toBeEnabled());
		expect(screen.getByText("About $2.50 with demo prices, within your $20.00.")).toBeInTheDocument();
		fireEvent.click(screen.getAllByRole("checkbox")[1]); expect(screen.getByRole("button", { name: copy.accept })).toBeDisabled();
	});
	it("never shows a budget control to a child", () => {
		review(proposal, true); expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
	});
	it("shows one clarification at a time, with manual picture escape", () => {
		review({ ...proposal, questions: [{ question: "Choose milk", options: proposal.items }, { question: "Choose bread", options: proposal.items }] });
		expect(screen.getByRole("heading", { name: "Choose milk" })).toBeInTheDocument();
		expect(screen.queryByRole("heading", { name: "Choose bread" })).not.toBeInTheDocument();
		expect(screen.getByRole("link", { name: copy.none })).toHaveAttribute("href", "/shop/products");
		const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
		expect(new Set(ids).size).toBe(ids.length);
		const choice = screen.getByRole("button", { name: copy.chooseLabel({ name: "Milk", size: "1 litre" }) });
		expect(choice).toHaveTextContent(copy.chooseProduct);
		fireEvent.click(choice);
		expect(screen.getByRole("heading", { name: "Choose bread" })).toHaveFocus();
	});
	it("does not block a child with a stale adult budget", () => {
		review({ ...proposal, budgetMinor: 2000 }, true);
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: copy.accept })).toBeEnabled();
	});
	it("reserves natural-height space for cards and their choice controls", () => {
		const styles = readFileSync(new URL("./ProposalReview.module.css", import.meta.url), "utf8");
		expect(styles).toMatch(/\.choice,\s*\.item\s*\{[^}]*display: flex;[^}]*flex-direction: column;/);
		expect(styles).toMatch(/\.choice > article,\s*\.item > article\s*\{[^}]*block-size: auto;/);
		expect(styles).toMatch(/\.chooseButton\s*\{[^}]*white-space: normal;/);
	});
});

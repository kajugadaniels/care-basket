import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DraftProvider, useDraft } from "@/features/requests/components/DraftProvider/DraftProvider";
import { requestsCopy } from "@/features/requests/copy";
import { assistantCopy as copy } from "../../copy";

const fake = vi.hoisted(() => ({ guide: vi.fn() }));
vi.mock("../../actions", () => ({ guideShoppingAction: fake.guide }));
import { ShoppingGuide } from "./ShoppingGuide";

const rice = {
	sku: "fictional-rice",
	displayName: "Rice",
	category: "PANTRY" as const,
	sizeLabel: "1 lb",
	imagePath: null,
};
const largeRice = { ...rice, sku: "fictional-rice-large", sizeLabel: "2 lb" };

function DraftState() {
	const { draft } = useDraft();
	return <output aria-label="Draft state">{JSON.stringify(draft)}</output>;
}

function open() {
	render(<DraftProvider><ShoppingGuide initialQuery="rice" /><DraftState /></DraftProvider>);
}

describe("requester shopping guide", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		fake.guide.mockResolvedValue({ ok: true, data: {
			kind: "CLARIFICATION",
			question: copy.question,
			options: [rice, largeRice],
			differences: { displayName: false, category: false, sizeLabel: true },
		} });
	});

	it("shows comparison choices without adding anything automatically", async () => {
		open();
		expect(screen.getByRole("textbox", { name: copy.guideLabel })).toHaveAccessibleDescription(copy.guideHelp);
		fireEvent.click(screen.getByRole("button", { name: copy.guideSearch }));

		expect(await screen.findByRole("heading", { name: copy.question })).toHaveFocus();
		expect(fake.guide).toHaveBeenCalledWith({ kind: "SEARCH", query: "rice", limit: 6 });
		expect(screen.getByLabelText("Draft state")).toHaveTextContent('"items":[]');
		expect(screen.getAllByRole("article")).toHaveLength(2);

		const card = within(screen.getAllByRole("article", { name: "Rice" })[0]!.parentElement!);
		fireEvent.click(card.getByRole("button", { name: requestsCopy.add }));
		expect(screen.getByLabelText("Draft state")).toHaveTextContent('"sku":"fictional-rice"');
	});

	it("keeps the words visible and offers another search when nothing matches", async () => {
		fake.guide.mockResolvedValue({ ok: true, data: { kind: "PROPOSAL", requestedText: "purple beans",
			products: [], unresolved: ["purple beans"], hasMore: false } });
		open();
		const input = screen.getByRole("textbox", { name: copy.guideLabel });
		fireEvent.change(input, { target: { value: "purple beans" } });
		fireEvent.click(screen.getByRole("button", { name: copy.guideSearch }));

		expect(await screen.findByText(copy.guideNoMatches({ query: "purple beans" }))).toHaveAttribute("role", "status");
		expect(input).toHaveValue("purple beans");
		expect(screen.queryByRole("article")).not.toBeInTheDocument();
	});

	it("preserves the query and focuses a recoverable error", async () => {
		fake.guide.mockRejectedValue(new Error("offline"));
		open();
		fireEvent.click(screen.getByRole("button", { name: copy.guideSearch }));

		const alert = await screen.findByRole("alert");
		await waitFor(() => expect(alert).toHaveFocus());
		expect(alert).toHaveTextContent(copy.guideError);
		expect(screen.getByRole("textbox", { name: copy.guideLabel })).toHaveValue("rice");
	});

	it("uses a single-column mobile grid and a wider two-column layout", () => {
		const css = readFileSync(resolve(
			"src/features/assistant/components/ShoppingGuide/ShoppingGuide.module.css",
		), "utf8");
		expect(css).toMatch(/\.grid\s*\{[^}]*display: grid;[^}]*gap:/);
		expect(css).toMatch(/@media \(min-width: 40rem\)[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
		expect(css).not.toContain("@keyframes");
	});
});

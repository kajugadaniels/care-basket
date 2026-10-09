import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestIds, requestProduct } from "@/test/factories/requests";
import type { RequestMutationResult } from "../../types";
const fake = vi.hoisted(() => ({ submit: vi.fn() }));
vi.mock("@/features/requests/actions", () => ({ submitRequestAction: fake.submit }));
import { DraftProvider } from "../DraftProvider/DraftProvider";
import { ProductSelection } from "../DraftProvider/ProductSelection";
import { BasketReview } from "./BasketReview";

function BasketFixture({ selecting = true, reviewing = true }: { selecting?: boolean; reviewing?: boolean }) {
	return <DraftProvider>
		{selecting ? <ProductSelection product={requestProduct}><p>Catalog item</p></ProductSelection> : null}
		{reviewing ? <BasketReview /> : null}
	</DraftProvider>;
}
function add() { fireEvent.click(screen.getByRole("button", { name: "Add to my list" })); }
describe("shopping basket review", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.spyOn(crypto, "randomUUID").mockReturnValue(requestIds.key as ReturnType<typeof crypto.randomUUID>);
		fake.submit.mockResolvedValue({ ok: true, data: { requestId: requestIds.request } });
	});
	it("shows an empty state and working catalog link without a submit button", () => {
		render(<BasketFixture />);
		expect(screen.getByText("Your shopping list is empty.")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Back to groceries" })).toHaveAttribute("href", "/shop/products");
		expect(screen.queryByRole("button", { name: "Send My Shopping List" })).not.toBeInTheDocument();
	});
	it("does not submit on add, and preserves the draft when catalog controls unmount", () => {
		const { rerender } = render(<BasketFixture />); add();
		expect(fake.submit).not.toHaveBeenCalled();
		rerender(<BasketFixture selecting={false} />);
		expect(screen.getByRole("heading", { name: requestProduct.displayName })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Send My Shopping List" })).toBeEnabled();
	});
	it("submits only SKU, quantity, mode and the stable key", async () => {
		render(<BasketFixture />); add();
		fireEvent.click(screen.getByRole("button", { name: "Send My Shopping List" }));
		await waitFor(() => expect(fake.submit).toHaveBeenCalledWith({ clientRequestKey: requestIds.key,
			inputMode: "PICTURES", items: [{ sku: requestProduct.sku, quantity: 1 }] }));
		const heading = await screen.findByRole("heading", { name: "Your shopping list has been sent!" });
		await waitFor(() => expect(heading).toHaveFocus());
		expect(screen.getByRole("link", { name: "View Details" })).toHaveAttribute("href", `/shop/requests/${requestIds.request}`);
		expect(screen.getByText("Waiting for review")).toBeInTheDocument();
	});
	it("freezes quantities and prevents double submissions while pending", async () => {
		let resolve!: (result: RequestMutationResult) => void;
		fake.submit.mockImplementation(() => new Promise<RequestMutationResult>((done) => { resolve = done; }));
		render(<BasketFixture />); add();
		const submit = screen.getByRole("button", { name: "Send My Shopping List" });
		fireEvent.click(submit); fireEvent.click(submit);
		await waitFor(() => expect(fake.submit).toHaveBeenCalledOnce());
		expect(screen.getByRole("button", { name: "Sending your shopping list…" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Clear my list" })).toBeDisabled();
		for (const button of screen.getAllByRole("button", { name: "Increase quantity for Demo milk" })) expect(button).toBeDisabled();
		resolve({ ok: true, data: { requestId: requestIds.request } });
		await screen.findByRole("heading", { name: "Your shopping list has been sent!" });
	});
	it("retains the draft and key after failure and focuses the retry error", async () => {
		fake.submit.mockResolvedValueOnce({ ok: false, error: { code: "INTERNAL", message: "Please try again." } });
		render(<BasketFixture />); add();
		fireEvent.click(screen.getByRole("button", { name: "Send My Shopping List" }));
		const error = await screen.findByRole("alert");
		await waitFor(() => expect(error).toHaveFocus());
		expect(screen.getByRole("heading", { name: "Demo milk" })).toBeInTheDocument();
		await waitFor(() => expect(screen.getByRole("button", { name: "Send My Shopping List" })).toBeEnabled());
		fireEvent.click(screen.getByRole("button", { name: "Send My Shopping List" }));
		await screen.findByRole("heading", { name: "Your shopping list has been sent!" });
		expect(fake.submit.mock.calls[0][0]).toEqual(fake.submit.mock.calls[1][0]);
	});
	it("retains the list and key for retry after a transport failure", async () => {
		fake.submit.mockRejectedValueOnce(new Error("offline"));
		render(<BasketFixture />); add();
		fireEvent.click(screen.getByRole("button", { name: "Send My Shopping List" }));
		await screen.findByRole("alert");
		await waitFor(() => expect(screen.getByRole("button", { name: "Send My Shopping List" })).toBeEnabled());
		expect(screen.getByRole("heading", { name: requestProduct.displayName })).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Send My Shopping List" }));
		await screen.findByRole("heading", { name: "Your shopping list has been sent!" });
		expect(fake.submit).toHaveBeenCalledTimes(2);
		expect(fake.submit.mock.calls[1][0]).toEqual(fake.submit.mock.calls[0][0]);
	});
	it("clears the draft only after confirmed server success", async () => {
		const { rerender } = render(<BasketFixture />); add();
		fireEvent.click(screen.getByRole("button", { name: "Send My Shopping List" }));
		await screen.findByRole("heading", { name: "Your shopping list has been sent!" });
		rerender(<BasketFixture reviewing={false} />);
		expect(screen.getByRole("button", { name: "Add to my list" })).toBeEnabled();
	});
	it("supports explicit clearing without a request", () => {
		render(<BasketFixture selecting={true} />); add();
		fireEvent.click(screen.getByRole("button", { name: "Clear my list" }));
		expect(screen.getByText("Your shopping list is empty.")).toBeInTheDocument();
		expect(fake.submit).not.toHaveBeenCalled();
	});
});

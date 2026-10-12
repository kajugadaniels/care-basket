import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestIds, requestProduct } from "@/test/factories/requests";
import type { RequestMutationResult } from "../../types";
import { requestsCopy } from "../../copy";
const fake = vi.hoisted(() => ({ submit: vi.fn() }));
vi.mock("@/features/requests/actions", () => ({ submitRequestAction: fake.submit }));
import { DraftProvider } from "../DraftProvider/DraftProvider";
import { ProductSelection } from "../DraftProvider/ProductSelection";
import { BasketReview } from "./BasketReview";

function BasketFixture({ selecting = true, reviewing = true, products = [requestProduct] }: {
	selecting?: boolean;
	reviewing?: boolean;
	products?: (typeof requestProduct)[];
}) {
	return <DraftProvider>
		{selecting ? products.map((product) => (
			<ProductSelection key={product.sku} product={product}><p>Catalog item</p></ProductSelection>
		)) : null}
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
		render(<BasketFixture selecting={false} />);
		const empty = screen.getByRole("region", { name: requestsCopy.emptyBasket });
		expect(within(empty).getByRole("heading", { level: 2, name: requestsCopy.emptyBasket })).toBeInTheDocument();
		expect(within(empty).getByText(requestsCopy.emptyBasketHelp)).toBeInTheDocument();
		expect(within(empty).getByRole("link", { name: requestsCopy.emptyBasketBrowse })).toHaveAttribute("href", "/shop/products");
		expect(screen.getAllByRole("link")).toHaveLength(1);
		expect(empty.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
		expect(screen.queryByText(requestsCopy.basketIntro)).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Send My Shopping List" })).not.toBeInTheDocument();
		expect(fake.submit).not.toHaveBeenCalled();
	});
	it("omits the unsent-list notice for both empty and populated baskets", () => {
		render(<BasketFixture />);
		const notice = "Your unsent list stays here while you browse. Reloading or closing this page clears it.";
		expect(screen.queryByText(notice)).not.toBeInTheDocument();
		add();
		expect(screen.queryByText(notice)).not.toBeInTheDocument();
		expect(screen.queryByRole("region", { name: requestsCopy.emptyBasket })).not.toBeInTheDocument();
		expect(screen.getByText(requestsCopy.basketIntro)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: requestsCopy.browse })).toHaveAttribute("href", "/shop/products");
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
		expect(screen.getByText(requestsCopy.statuses.PENDING_REVIEW)).toHaveAttribute("role", "status");
	});
	it("freezes quantities and prevents double submissions while pending", async () => {
		let resolve!: (result: RequestMutationResult) => void;
		fake.submit.mockImplementation(() => new Promise<RequestMutationResult>((done) => { resolve = done; }));
		render(<BasketFixture />); add();
		const submit = screen.getByRole("button", { name: "Send My Shopping List" });
		fireEvent.click(submit); fireEvent.click(submit);
		await waitFor(() => expect(fake.submit).toHaveBeenCalledOnce());
		expect(screen.getByRole("button", { name: "Sending your shopping list…" })).toBeDisabled();
		expect(screen.getAllByText(requestsCopy.sending)).toHaveLength(1);
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
		expect(screen.getByRole("region", { name: requestsCopy.emptyBasket })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: requestsCopy.emptyBasketBrowse })).toHaveAttribute("href", "/shop/products");
		expect(fake.submit).not.toHaveBeenCalled();
	});
	it("groups the send action separately from the selected groceries", () => {
		render(<BasketFixture />);
		add();
		expect(screen.getByRole("list", { name: "Groceries in your list" })).toHaveTextContent(requestProduct.displayName);
		expect(screen.getByRole("complementary", { name: "Ready to send?" })).toHaveTextContent(requestsCopy.draftCount(1));
		expect(fake.submit).not.toHaveBeenCalled();
	});
	it("keeps product headings below the grocery section and shows reviewed images", () => {
		const pictured = { ...requestProduct, imagePath: "/products/demo-milk.jpg" };
		render(<BasketFixture products={[pictured]} />);
		add();
		const groceries = screen.getByRole("region", { name: requestsCopy.listItems });
		expect(within(groceries).getByRole("heading", { level: 2, name: requestsCopy.listItems })).toBeInTheDocument();
		expect(within(groceries).getByRole("heading", { level: 3, name: pictured.displayName })).toBeInTheDocument();
		expect(within(groceries).getByRole("img", { name: `${pictured.displayName}, ${pictured.sizeLabel}` })).toBeInTheDocument();
		expect(within(groceries).getByRole("group", { name: `${requestsCopy.quantity}: ${pictured.displayName}` })).toBeInTheDocument();
		expect(within(groceries).queryByText(/\$\d/)).not.toBeInTheDocument();
	});
	it("updates the summary immediately when a specific grocery is removed", () => {
		const bread = { ...requestProduct, sku: "demo-bread", displayName: "Demo bread" };
		render(<BasketFixture products={[requestProduct, bread]} />);
		const addButtons = screen.getAllByRole("button", { name: "Add to my list" });
		fireEvent.click(addButtons[0]);
		fireEvent.click(addButtons[1]);
		const summary = screen.getByRole("complementary", { name: requestsCopy.readyToSend });
		expect(within(summary).getByText(requestsCopy.draftCount(2))).toBeInTheDocument();
		const groceries = screen.getByRole("region", { name: requestsCopy.listItems });
		fireEvent.click(within(groceries).getByRole("button", { name: `${requestsCopy.remove}: ${requestProduct.displayName}` }));
		expect(within(groceries).queryByRole("heading", { name: requestProduct.displayName })).not.toBeInTheDocument();
		expect(within(groceries).getByRole("heading", { name: bread.displayName })).toBeInTheDocument();
		expect(within(summary).getByText(requestsCopy.draftCount(1))).toBeInTheDocument();
		expect(fake.submit).not.toHaveBeenCalled();
	});
	it("keeps quantity limits and announcements in the redesigned row", () => {
		render(<BasketFixture />);
		add();
		const groceries = screen.getByRole("region", { name: requestsCopy.listItems });
		const decrease = within(groceries).getByRole("button", { name: requestsCopy.decrease(requestProduct.displayName) });
		const increase = within(groceries).getByRole("button", { name: requestsCopy.increase(requestProduct.displayName) });
		expect(decrease).toBeDisabled();
		for (let quantity = 1; quantity < 20; quantity += 1) fireEvent.click(increase);
		expect(increase).toBeDisabled();
		const output = within(groceries).getByRole("status");
		expect(output).toHaveTextContent(`${requestsCopy.quantity}: 20`);
		expect(output).toHaveAttribute("aria-live", "polite");
		fireEvent.click(decrease);
		expect(output).toHaveTextContent(`${requestsCopy.quantity}: 19`);
		expect(increase).toBeEnabled();
		expect(fake.submit).not.toHaveBeenCalled();
	});
	it("returns to the empty state after removing the last grocery", () => {
		render(<BasketFixture />);
		add();
		const groceries = screen.getByRole("region", { name: requestsCopy.listItems });
		fireEvent.click(within(groceries).getByRole("button", { name: `${requestsCopy.remove}: ${requestProduct.displayName}` }));
		expect(screen.getByRole("region", { name: requestsCopy.emptyBasket })).toBeInTheDocument();
		expect(screen.queryByRole("complementary", { name: requestsCopy.readyToSend })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: requestsCopy.send })).not.toBeInTheDocument();
		expect(fake.submit).not.toHaveBeenCalled();
	});
});

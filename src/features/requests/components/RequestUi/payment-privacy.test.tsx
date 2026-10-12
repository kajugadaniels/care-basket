import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeManagerRequest, makeOwnRequest, requestIds } from "@/test/factories/requests";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/features/checkout/actions", () => ({ startCheckoutAction: vi.fn(), cancelCheckoutAction: vi.fn(),
	captureCheckoutAction: vi.fn(), refreshCheckoutAction: vi.fn() }));
vi.mock("@/features/requests/actions", () => ({ cancelRequestAction: vi.fn(), declineRequestAction: vi.fn(),
	updateRequestItemAction: vi.fn(), removeRequestItemAction: vi.fn() }));
import { RequestDetail } from "./RequestDetail";
import { RequestList } from "./RequestList";

describe("verified payment presentation and requester privacy", () => {
	it.each(["REFUNDED", "REVERSED"] as const)("shows a plain %s update instead of current paid success", (paymentState) => {
		const request = makeOwnRequest({ status: "PAID", editable: false, paymentState });
		render(<RequestDetail request={request} checkout={{ paymentId: requestIds.key, orderId: "PRIVATEORDER", state: paymentState,
			captureId: "PRIVATECAPTURE", amount: "$5.00", buyerApprovalEnabled: false }} />);
		expect(screen.getByRole("region", { name: "Payment updated" })).toHaveTextContent("Ask your family to help.");
		expect(screen.queryByText("Payment confirmed")).not.toBeInTheDocument();
		expect(screen.queryByText(/PRIVATEORDER|PRIVATECAPTURE|\$5|PayPal/)).not.toBeInTheDocument();
	});
	it("shows payment updates in requester history without financial fields", () => {
		render(<RequestList result={{ requests: [makeOwnRequest({ status: "PAID", paymentState: "REVERSED" })], nextCursor: null }} />);
		expect(screen.getByText("Payment updated")).toBeInTheDocument();
		expect(screen.queryByText("Payment confirmed")).not.toBeInTheDocument();
	});
	it("keeps a manager refund distinct from the historical captured amount and delivery", () => {
		render(<RequestDetail request={makeManagerRequest({ status: "PAID", editable: false })}
			checkout={{ paymentId: requestIds.key, orderId: "ORDER1", state: "REFUNDED", amount: "$5.00", captureId: "CAPTURE1",
				capturedAt: "2026-10-12T00:00:00Z", buyerApprovalEnabled: false }} />);
		expect(screen.getByText("PayPal has recorded a refund")).toBeInTheDocument();
		expect(screen.getByText("Original captured amount")).toBeInTheDocument();
		expect(screen.getByText("Delivery: Not arranged (demo)")).toBeInTheDocument();
		expect(screen.queryByText("Payment confirmed")).not.toBeInTheDocument();
	});
});

import type { ReactNode } from "react";
import { fireEvent, render as renderTree, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShopShell } from "@/features/devices/components/ShopShell/ShopShell";
import { devicesCopy } from "@/features/devices/copy";
import { assistantCopy as copy } from "../../copy";
import type { Proposal } from "../../types";
import { AssistantProvider } from "../AssistantProvider/AssistantProvider";

const fake = vi.hoisted(() => ({ text: vi.fn(), recorder: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: fake.push }) }));
vi.mock("../../actions", () => ({ interpretTextAction: fake.text }));
vi.mock("../VoiceRecorder/VoiceRecorder", () => ({
	VoiceRecorder: ({ onType, onProposal }: { onType(): void; onProposal(proposal: Proposal): void }) => {
		fake.recorder();
		return (
			<section aria-label="Voice recorder">
				<button onClick={onType}>{copy.type}</button>
				<button onClick={() => onProposal({ inputMode: "VOICE", inputText: "milk", local: false,
					items: [], questions: [], unrecognized: [], budgetMinor: null })}>{copy.stop}</button>
			</section>
		);
	},
}));

import { AssistantStart } from "./AssistantStart";

function render(ui: ReactNode) {
	return renderTree(<AssistantProvider>{ui}</AssistantProvider>);
}

describe("assistant entry", () => {
	beforeEach(() => vi.resetAllMocks());

	it("welcomes the person and opens typing without an extra start screen", () => {
		render(<AssistantStart displayName="Rose" voice={false} child={false} />);
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(copy.greeting({ name: "Rose" }));
		expect(screen.getByRole("textbox", { name: copy.prompt })).toHaveAccessibleDescription(copy.typingHelp);
		expect(screen.getByRole("button", { name: copy.type })).toHaveAttribute("aria-pressed", "true");
		expect(screen.queryByRole("button", { name: copy.cancel })).not.toBeInTheDocument();
	});

	it("explains unavailable speech and keeps products and my list in the top navigation", () => {
		render(<ShopShell><AssistantStart voice={false} child={false} /></ShopShell>);
		expect(screen.getByRole("button", { name: copy.speak })).toBeDisabled();
		expect(screen.getByRole("button", { name: copy.speak })).toHaveAccessibleDescription(copy.voiceUnavailable);
		const navigation = within(screen.getByRole("navigation", { name: devicesCopy.shopNav }));
		expect(navigation.getByRole("link", { name: devicesCopy.shopProducts })).toHaveAttribute("href", "/shop/products");
		expect(navigation.getByRole("link", { name: devicesCopy.shopList })).toHaveAttribute("href", "/shop/basket");
		expect(screen.getByRole("link", { name: copy.sentLists })).toHaveAttribute("href", "/shop/requests");
		expect(fake.recorder).not.toHaveBeenCalled();
	});

	it("never opens recording for a child even if a stale voice prop is true", () => {
		render(<AssistantStart voice child />);
		fireEvent.click(screen.getByRole("button", { name: copy.speak }));
		expect(screen.getByRole("button", { name: copy.speak })).toBeDisabled();
		expect(screen.getByRole("textbox", { name: copy.prompt })).toBeInTheDocument();
		expect(fake.recorder).not.toHaveBeenCalled();
	});

	it("opens the lazy recorder only after selecting permitted speech and retains typed input", async () => {
		render(<AssistantStart voice child={false} />);
		expect(fake.recorder).not.toHaveBeenCalled();
		fireEvent.change(screen.getByRole("textbox", { name: copy.prompt }), { target: { value: "milk" } });
		fireEvent.click(screen.getByRole("button", { name: copy.speak }));
		const recorder = await screen.findByRole("region", { name: "Voice recorder" });
		expect(screen.getByRole("button", { name: copy.speak })).toHaveAttribute("aria-pressed", "true");
		fireEvent.click(within(recorder).getByRole("button", { name: copy.type }));
		expect(screen.getByRole("textbox", { name: copy.prompt })).toHaveValue("milk");
		expect(screen.queryByRole("region", { name: "Voice recorder" })).not.toBeInTheDocument();
	});

	it("retains typed input and focuses a calm error after transport failure", async () => {
		fake.text.mockRejectedValue(new Error("offline"));
		render(<AssistantStart voice={false} child={false} />);
		const input = screen.getByRole("textbox", { name: copy.prompt });
		fireEvent.change(input, { target: { value: "milk" } });
		fireEvent.click(screen.getByRole("button", { name: copy.continue }));
		expect(await screen.findByRole("alert")).toHaveFocus();
		expect(input).toHaveValue("milk");
		expect(fake.text).toHaveBeenCalledWith({ text: "milk" });
	});

	it("opens the dedicated review route instead of replacing the assistant screen", async () => {
		const proposal: Proposal = { inputMode: "TEXT", inputText: "milk", local: true,
			items: [], questions: [], unrecognized: [], budgetMinor: null };
		fake.text.mockResolvedValue({ ok: true, data: proposal });
		render(<AssistantStart displayName="Rose" voice={false} child={false} />);
		fireEvent.change(screen.getByRole("textbox", { name: copy.prompt }), { target: { value: "milk" } });
		fireEvent.click(screen.getByRole("button", { name: copy.continue }));
		await waitFor(() => expect(fake.push).toHaveBeenCalledExactlyOnceWith("/shop/assistant/review"));
		expect(screen.getByRole("textbox", { name: copy.prompt })).toHaveValue("milk");
		expect(screen.queryByRole("heading", { name: copy.review })).not.toBeInTheDocument();
	});

	it("opens the same review route for speech and keeps the transcript for editing", async () => {
		render(<AssistantStart voice child={false} />);
		fireEvent.click(screen.getByRole("button", { name: copy.speak }));
		const recorder = await screen.findByRole("region", { name: "Voice recorder" });
		fireEvent.click(within(recorder).getByRole("button", { name: copy.stop }));
		expect(fake.push).toHaveBeenCalledExactlyOnceWith("/shop/assistant/review");
		fireEvent.click(within(recorder).getByRole("button", { name: copy.type }));
		expect(screen.getByRole("textbox", { name: copy.prompt })).toHaveValue("milk");
	});
});

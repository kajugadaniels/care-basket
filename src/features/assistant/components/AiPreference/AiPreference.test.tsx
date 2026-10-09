import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { requestIds } from "@/test/factories/requests";
import { assistantCopy as copy } from "../../copy";
const fake = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock("../../actions", () => ({ updateAiPreferenceAction: fake.update }));
import { AiPreference } from "./AiPreference";
describe("separate AI consent", () => {
	it("does not advertise an enable switch while deployment eligibility is blocked", () => {
		render(<AiPreference profileId={requestIds.profile} enabled={false} available={false} />);
		expect(screen.getByText(copy.blocked)).toBeInTheDocument(); expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: copy.enable })).not.toBeInTheDocument();
	});
	it("requires explicit confirmation when available", () => {
		render(<AiPreference profileId={requestIds.profile} enabled={false} available />);
		expect(screen.getByRole("button", { name: copy.enable })).toBeDisabled();
		fireEvent.click(screen.getByRole("checkbox", { name: copy.consent }));
		expect(screen.getByRole("button", { name: copy.enable })).toBeEnabled();
	});
	it("still permits revocation while the global gate is closed", async () => {
		fake.update.mockResolvedValue({ ok: true, data: { profileId: requestIds.profile } });
		render(<AiPreference profileId={requestIds.profile} enabled available={false} />);
		fireEvent.click(screen.getByRole("button", { name: copy.revoke }));
		await waitFor(() => expect(fake.update).toHaveBeenCalledWith({ profileId: requestIds.profile, enabled: false, consent: false }));
		expect(await screen.findByRole("status")).toHaveFocus();
	});
});

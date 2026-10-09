import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { VoiceRecorder } from "./VoiceRecorder";
import { assistantCopy as copy } from "../../copy";

describe("opt-in microphone capture", () => {
	afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
	it("does not request microphone access on mount and handles unsupported recording", async () => {
		vi.stubGlobal("MediaRecorder", undefined);
		const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
		render(<VoiceRecorder onProposal={vi.fn()} onType={vi.fn()} />);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: copy.start }));
		expect(await screen.findByRole("alert")).toHaveFocus(); expect(fetch).not.toHaveBeenCalled();
		expect(screen.getByRole("button", { name: copy.type })).toBeEnabled();
	});
	it("handles microphone denial without uploading or claiming success", async () => {
		const microphone = vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError"));
		vi.stubGlobal("isSecureContext", true); vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: microphone } });
		vi.stubGlobal("MediaRecorder", class { static isTypeSupported() { return true; } });
		const success = vi.fn(); render(<VoiceRecorder onProposal={success} onType={vi.fn()} />);
		expect(microphone).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole("button", { name: copy.start }));
		expect(await screen.findByRole("alert")).toHaveTextContent(copy.permissionError); expect(success).not.toHaveBeenCalled();
	});
	it("auto-stops at sixty seconds, releases tracks and never persists the recording", async () => {
		vi.useFakeTimers();
		const stopTrack = vi.fn(); const stopCapture = vi.fn();
		vi.stubGlobal("isSecureContext", true);
		vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] }) } });
		class Recorder {
			static isTypeSupported() { return true; }
			state = "inactive";
			ondataavailable: ((event: { data: Blob }) => void) | null = null;
			onstop: (() => void) | null = null;
			start() { this.state = "recording"; }
			stop() { this.state = "inactive"; stopCapture(); this.ondataavailable?.({ data: new Blob(["fictional-audio"], { type: "audio/webm" }) }); this.onstop?.(); }
		}
		vi.stubGlobal("MediaRecorder", Recorder);
		const upload = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: {} }) }); vi.stubGlobal("fetch", upload);
		render(<VoiceRecorder onProposal={vi.fn()} onType={vi.fn()} />);
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.start })); });
		expect(screen.getByText(copy.listening)).toBeInTheDocument();
		await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
		expect(stopCapture).toHaveBeenCalledOnce(); expect(stopTrack).toHaveBeenCalled();
		expect(upload).toHaveBeenCalledWith("/api/assistant/voice", expect.objectContaining({ method: "POST", body: expect.any(FormData) }));
	});
});

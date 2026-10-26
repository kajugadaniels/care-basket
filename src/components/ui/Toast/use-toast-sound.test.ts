import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToastSound } from "./use-toast-sound";

function fakeAudio() {
	const notes: number[] = [];
	const stops: number[] = [];
	const oscillators: { onended: (() => void) | null; disconnect: ReturnType<typeof vi.fn> }[] = [];
	const gains: { disconnect: ReturnType<typeof vi.fn> }[] = [];
	const audio = {
		state: "running", currentTime: 0, destination: {},
		resume: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined),
		createOscillator: vi.fn(() => {
			const oscillator = { type: "", frequency: { setValueAtTime: (frequency: number) => notes.push(frequency) },
				connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: (time: number) => stops.push(time), onended: null as (() => void) | null };
			oscillators.push(oscillator);
			return oscillator;
		}),
		createGain: vi.fn(() => {
			const gain = { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() };
			gains.push(gain);
			return gain;
		}),
	};
	const Constructor = vi.fn(function () { return audio; });
	vi.stubGlobal("AudioContext", Constructor);
	return { audio, Constructor, notes, stops, oscillators, gains };
}

describe("optional toast tones", () => {
	beforeEach(() => vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible"));
	afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
	it("never creates or plays audio merely because feedback mounts", () => {
		const { Constructor } = fakeAudio();
		const { result } = renderHook(useToastSound);
		act(() => result.current.play("success"));
		expect(Constructor).not.toHaveBeenCalled();
	});
	it("plays different brief tones, disconnects nodes and closes on unmount", () => {
		const { audio, Constructor, notes, stops, oscillators, gains } = fakeAudio();
		const { result, unmount } = renderHook(useToastSound);
		act(() => {
			result.current.prepare();
			result.current.play("success");
			result.current.play("warning");
			result.current.play("error");
		});
		expect(Constructor).toHaveBeenCalledOnce();
		expect(notes).toEqual([660, 880, 520, 440, 440, 330]);
		expect(Math.max(...stops)).toBeLessThan(0.5);
		oscillators.forEach((oscillator) => { oscillator.onended?.(); expect(oscillator.disconnect).toHaveBeenCalledOnce(); });
		gains.forEach((gain) => expect(gain.disconnect).toHaveBeenCalledOnce());
		unmount();
		expect(audio.close).toHaveBeenCalledOnce();
	});
	it("mutes a pending operation's sound and permits explicit re-enabling", () => {
		const { notes } = fakeAudio();
		const { result } = renderHook(useToastSound);
		act(() => result.current.prepare());
		act(() => result.current.toggle());
		act(() => result.current.play("success"));
		expect(notes).toEqual([]);
		expect(result.current.enabled).toBe(false);
		act(() => result.current.toggle());
		act(() => result.current.play("error"));
		expect(notes).toEqual([440, 330]);
	});
	it("resumes during a gesture but does not attempt playback while blocked", () => {
		const { audio, notes } = fakeAudio();
		audio.state = "suspended";
		audio.resume.mockRejectedValue(new Error("autoplay blocked"));
		const { result } = renderHook(useToastSound);
		act(() => { result.current.prepare(); result.current.play("success"); });
		expect(audio.resume).toHaveBeenCalledOnce();
		expect(notes).toEqual([]);
	});
	it("does not play in hidden tabs or fail when audio is unavailable", () => {
		const { notes } = fakeAudio();
		const { result } = renderHook(useToastSound);
		act(() => result.current.prepare());
		vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
		act(() => result.current.play("success"));
		expect(notes).toEqual([]);
		vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
		vi.stubGlobal("AudioContext", undefined);
		const other = renderHook(useToastSound);
		expect(() => act(() => other.result.current.prepare())).not.toThrow();
	});
	it("ignores constructor and playback failures without breaking feedback", () => {
		vi.stubGlobal("AudioContext", vi.fn(function () { throw new Error("audio unavailable"); }));
		const unavailable = renderHook(useToastSound);
		expect(() => act(() => unavailable.result.current.prepare())).not.toThrow();
		const { audio } = fakeAudio();
		audio.createOscillator.mockImplementation(() => { throw new Error("audio device lost"); });
		const playback = renderHook(useToastSound);
		expect(() => act(() => { playback.result.current.prepare(); playback.result.current.play("error"); })).not.toThrow();
	});
});

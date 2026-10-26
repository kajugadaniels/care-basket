import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./ToastProvider";

const sound = vi.hoisted(() => ({ prepare: vi.fn(), play: vi.fn() }));
vi.mock("./use-toast-sound", () => ({
	useToastSound: () => ({ ...sound, enabled: true, toggle: vi.fn() }),
}));

function Controls() {
	const toast = useToast();
	return <>
		<button onClick={() => toast.notify({ kind: "success", message: "Family member saved." })}>Success</button>
		<button onClick={() => toast.notify({ kind: "warning", message: "Connection expires soon." })}>Warning</button>
		<button onClick={() => toast.notify({ kind: "error", message: "Voice request failed." })}>Error</button>
	</>;
}

describe("global activity notifications", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
	});
	afterEach(() => vi.useRealTimers());

	it("announces success, warning, and error with distinct words and sounds", () => {
		render(<ToastProvider><Controls /></ToastProvider>);

		fireEvent.click(screen.getByRole("button", { name: "Success" }));
		expect(screen.getByRole("status")).toHaveTextContent("DoneFamily member saved.");
		expect(sound.play).toHaveBeenLastCalledWith("success");

		fireEvent.click(screen.getByRole("button", { name: "Warning" }));
		expect(screen.getByRole("status")).toHaveTextContent("Check thisConnection expires soon.");
		expect(sound.play).toHaveBeenLastCalledWith("warning");

		fireEvent.click(screen.getByRole("button", { name: "Error" }));
		expect(screen.getByRole("status")).toHaveTextContent("Action not completedVoice request failed.");
		expect(sound.play).toHaveBeenLastCalledWith("error");
	});

	it("clears temporary success but keeps an error until it is dismissed", () => {
		render(<ToastProvider><Controls /></ToastProvider>);
		fireEvent.click(screen.getByRole("button", { name: "Success" }));
		act(() => vi.advanceTimersByTime(5_000));
		expect(screen.getByRole("status")).toBeEmptyDOMElement();

		fireEvent.click(screen.getByRole("button", { name: "Error" }));
		act(() => vi.advanceTimersByTime(30_000));
		expect(screen.getByRole("status")).toHaveTextContent("Voice request failed.");
		fireEvent.click(screen.getByRole("button", { name: "Dismiss error notification" }));
		expect(screen.getByRole("status")).toBeEmptyDOMElement();
	});
});

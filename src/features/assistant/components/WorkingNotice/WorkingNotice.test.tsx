import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { WorkingNotice } from "./WorkingNotice";
import { assistantCopy } from "../../copy";

describe("shared interpretation progress", () => {
	afterEach(() => vi.useRealTimers());
	it("announces a calm slow-operation message after six seconds", () => {
		vi.useFakeTimers();
		const view = render(<WorkingNotice />);
		expect(screen.getByRole("status")).toHaveTextContent(assistantCopy.working);
		act(() => vi.advanceTimersByTime(6000));
		expect(screen.getByRole("status")).toHaveTextContent(assistantCopy.slow);
		view.unmount();
	});
});

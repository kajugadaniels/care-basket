import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { WorkingNotice } from "./WorkingNotice";
import { assistantCopy } from "../../copy";
import styles from "@/components/ui/LoadingState/LoadingState.module.css";

describe("shared interpretation progress", () => {
	afterEach(() => vi.useRealTimers());
	it("announces a calm slow-operation message after six seconds", () => {
		vi.useFakeTimers();
		const view = render(<WorkingNotice />);
		const status = screen.getByRole("status");
		expect(status).toHaveTextContent(assistantCopy.working);
		expect(screen.getByText(assistantCopy.working)).toHaveClass(styles.visuallyHidden);
		expect(status.querySelector("p")).toBeNull();
		expect(screen.queryByText("Understanding your list…")).not.toBeInTheDocument();
		act(() => vi.advanceTimersByTime(6000));
		expect(screen.getByRole("status")).toHaveTextContent(assistantCopy.slow);
		expect(status.querySelector("p")).toHaveTextContent(assistantCopy.slow);
		expect(status.querySelector("p")).toHaveAttribute("aria-hidden", "true");
		view.unmount();
	});

	it("cancels delayed feedback when the request finishes", () => {
		vi.useFakeTimers();
		const view = render(<WorkingNotice />);
		view.unmount();
		expect(vi.getTimerCount()).toBe(0);
	});
});

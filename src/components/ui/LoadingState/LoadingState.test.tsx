import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { LoadingState } from "./LoadingState";

describe("LoadingState", () => {
	it("announces its label while keeping the placeholders out of the accessibility tree", () => {
		render(
			<LoadingState label="Loading family members…">
				<Skeleton shape="heading" />
				<Skeleton shape="pill" />
			</LoadingState>,
		);

		const status = screen.getByRole("status");
		expect(status).toHaveTextContent("Loading family members…");
		expect(status).not.toHaveAttribute("aria-busy");
		expect(status.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
	});
});

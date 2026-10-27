import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ColDef } from "ag-grid-community";

vi.mock("ag-grid-react", () => ({
	AgGridReact: ({ quickFilterText, rowData }: { quickFilterText: string; rowData: unknown[] }) => (
		<div role="grid">{`${rowData.length} rows; filter: ${quickFilterText}`}</div>
	),
}));

import { ManagerDataGrid } from "./ManagerDataGrid";

type Row = { id: string; name: string };
const rows: Row[] = [{ id: "rice", name: "Rice" }];
const columns: ColDef<Row>[] = [{ field: "name", headerName: "Name" }];

function useViewport(matches: boolean) {
	vi.stubGlobal("matchMedia", vi.fn(() => ({
		matches,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	})));
}

function renderGrid() {
	return render(
		<ManagerDataGrid
			columns={columns}
			label="Records"
			mobileFallback={<p>Mobile cards</p>}
			noMatches="No matching records."
			rows={rows}
			searchLabel="Search records"
			searchPlaceholder="Try a name"
		/>,
	);
}

describe("responsive manager data grid", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("keeps the simpler card presentation on narrow screens", () => {
		useViewport(false);
		renderGrid();

		expect(screen.getByText("Mobile cards")).toBeInTheDocument();
		expect(screen.queryByRole("grid")).not.toBeInTheDocument();
	});

	it("offers searchable grid data on desktop", () => {
		useViewport(true);
		renderGrid();

		const search = screen.getByRole("searchbox", { name: "Search records" });
		expect(screen.getByRole("region", { name: "Records" })).toBeInTheDocument();
		expect(screen.getByRole("grid")).toHaveTextContent("1 rows; filter:");
		fireEvent.change(search, { target: { value: "rice" } });
		expect(screen.getByRole("grid")).toHaveTextContent("filter: rice");
	});
});

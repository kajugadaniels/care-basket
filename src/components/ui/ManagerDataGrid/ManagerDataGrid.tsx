"use client";

import { useId, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import {
	ClientSideRowModelModule,
	QuickFilterModule,
	themeQuartz,
	type ColDef,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { Icon } from "@/components/ui/Icon/Icon";
import styles from "./ManagerDataGrid.module.css";

const DESKTOP_GRID_QUERY = "(min-width: 64rem)";
const GRID_MODULES = [ClientSideRowModelModule, QuickFilterModule];

const managerGridTheme = themeQuartz.withParams({
	accentColor: "var(--color-primary)",
	backgroundColor: "var(--color-surface)",
	borderColor: "var(--color-border)",
	foregroundColor: "var(--color-text)",
	fontFamily: "var(--font-sans)",
	fontSize: "var(--text-sm)",
	headerBackgroundColor: "var(--color-surface-soft)",
	headerHeight: "var(--control-height)",
	headerTextColor: "var(--color-text)",
	rowHeight: "var(--control-height-lg)",
	rowHoverColor: "var(--color-surface-soft)",
	selectedRowBackgroundColor: "var(--color-surface-accent)",
	wrapperBorderRadius: "var(--radius-lg)",
});

type ManagerDataGridProps<TData extends { id: string }> = {
	columns: ColDef<TData>[];
	label: string;
	mobileFallback: ReactNode;
	noMatches: string;
	rows: TData[];
	searchLabel: string;
	searchPlaceholder: string;
};

function subscribeToDesktopGrid(callback: () => void) {
	if (!window.matchMedia) return () => undefined;

	const media = window.matchMedia(DESKTOP_GRID_QUERY);
	media.addEventListener("change", callback);
	return () => media.removeEventListener("change", callback);
}

function usesDesktopGrid() {
	return window.matchMedia?.(DESKTOP_GRID_QUERY).matches ?? false;
}

export function ManagerDataGrid<TData extends { id: string }>({
	columns,
	label,
	mobileFallback,
	noMatches,
	rows,
	searchLabel,
	searchPlaceholder,
}: ManagerDataGridProps<TData>) {
	const [query, setQuery] = useState("");
	const [hasMatches, setHasMatches] = useState(true);
	const searchId = useId();
	const isDesktop = useSyncExternalStore(subscribeToDesktopGrid, usesDesktopGrid, () => false);
	const defaultColumn = useMemo<ColDef<TData>>(() => ({
		resizable: true,
		sortable: true,
		suppressHeaderMenuButton: true,
	}), []);
	if (!isDesktop) return mobileFallback;

	return (
		<section className={styles.directory} aria-label={label}>
			<div className={styles.searchField}>
				<label htmlFor={searchId}>{searchLabel}</label>
				<div className={styles.searchControl}>
					<Icon icon={Search01Icon} size={20} className={styles.searchIcon} />
					<input
						id={searchId}
						type="search"
						value={query}
						placeholder={searchPlaceholder}
						onChange={(event) => {
							setQuery(event.target.value);
							if (!event.target.value) setHasMatches(true);
						}}
					/>
				</div>
			</div>
			<div className={styles.grid}>
				<AgGridReact<TData>
					modules={GRID_MODULES}
					theme={managerGridTheme}
					rowData={rows}
					columnDefs={columns}
					defaultColDef={defaultColumn}
					quickFilterText={query}
					cacheQuickFilter
					domLayout="autoHeight"
					ensureDomOrder
					suppressColumnVirtualisation
					suppressRowVirtualisation
					animateRows={false}
					getRowId={({ data }) => data.id}
					onFilterChanged={({ api }) => setHasMatches(api.getDisplayedRowCount() > 0)}
				/>
			</div>
			{query && !hasMatches ? <p className={styles.noMatches} role="status">{noMatches}</p> : null}
		</section>
	);
}

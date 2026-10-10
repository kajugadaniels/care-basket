"use client";

import { CatalogError } from "@/features/catalog/components/CatalogBrowser/CatalogError";

export default function ProductsError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
	return <CatalogError retry={retry} requester />;
}

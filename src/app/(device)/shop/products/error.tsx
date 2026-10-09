"use client";

import { CatalogError } from "@/features/catalog/components/CatalogBrowser/CatalogError";
import { RequesterFrame } from "@/features/devices/components/RequesterFrame/RequesterFrame";

export default function ProductsError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
	return <RequesterFrame wide><CatalogError retry={retry} requester /></RequesterFrame>;
}

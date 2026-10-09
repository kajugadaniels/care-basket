import { Suspense } from "react";
import { requireAdult } from "@/server/auth/require-adult";
import { AppError } from "@/server/errors";
import { CatalogBrowser } from "@/features/catalog/components/CatalogBrowser/CatalogBrowser";
import { CatalogSkeleton } from "@/features/catalog/components/CatalogBrowser/CatalogSkeleton";
import { catalogCopy } from "@/features/catalog/copy";
import { parseCatalogSearchParams } from "@/features/catalog/schemas";
import { listManagerProducts } from "@/features/catalog/server/service";
import type { CatalogSearchParams } from "@/features/catalog/types";

export const metadata = { title: catalogCopy.managerTitle };

async function CatalogContent({ searchParams }: { searchParams: CatalogSearchParams }) {
	const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
	const parsed = parseCatalogSearchParams(await searchParams);
	if (!parsed.success) throw new AppError("VALIDATION_FAILED");
	const result = await listManagerProducts(actor, parsed.data);
	return <CatalogBrowser view="manager" filters={parsed.data} result={result} />;
}

export default function CatalogPage({ searchParams }: { searchParams: CatalogSearchParams }) {
	return <Suspense fallback={<CatalogSkeleton />}><CatalogContent searchParams={searchParams} /></Suspense>;
}

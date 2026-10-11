import { Suspense } from "react";
import { requireDevice } from "@/server/auth/require-device";
import { AppError } from "@/server/errors";
import { ReconnectDevice } from "@/features/devices/components/ReconnectDevice/ReconnectDevice";
import { CatalogBrowser } from "@/features/catalog/components/CatalogBrowser/CatalogBrowser";
import { ShopLoading } from "@/features/devices/components/ShopLoading/ShopLoading";
import { catalogCopy } from "@/features/catalog/copy";
import { parseCatalogSearchParams } from "@/features/catalog/schemas";
import { listRequesterProducts } from "@/features/catalog/server/service";
import type { CatalogSearchParams } from "@/features/catalog/types";

export const metadata = { title: catalogCopy.requesterTitle };

async function ProductsContent({ searchParams }: { searchParams: CatalogSearchParams }) {
	let actor;
	try {
		actor = await requireDevice();
	} catch (error) {
		if (error instanceof AppError && error.code === "UNAUTHENTICATED") return <ReconnectDevice />;
		throw error;
	}
	const parsed = parseCatalogSearchParams(await searchParams);
	if (!parsed.success) throw new AppError("VALIDATION_FAILED");
	const filters = { ...parsed.data, limit: 12 };
	const result = await listRequesterProducts(actor, filters);
	return <CatalogBrowser filters={filters} result={result} selectable child={actor.profileKind === "CHILD"} />;
}

export default function ProductsPage({ searchParams }: { searchParams: CatalogSearchParams }) {
	return <Suspense fallback={<ShopLoading label={catalogCopy.loading} />}><ProductsContent searchParams={searchParams} /></Suspense>;
}

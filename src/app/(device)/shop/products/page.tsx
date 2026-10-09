import { Suspense } from "react";
import { requireDevice } from "@/server/auth/require-device";
import { AppError } from "@/server/errors";
import { RequesterFrame } from "@/features/devices/components/RequesterFrame/RequesterFrame";
import { ShopHome } from "@/features/devices/components/ShopHome/ShopHome";
import { CatalogBrowser } from "@/features/catalog/components/CatalogBrowser/CatalogBrowser";
import { CatalogSkeleton } from "@/features/catalog/components/CatalogBrowser/CatalogSkeleton";
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
		if (error instanceof AppError && error.code === "UNAUTHENTICATED") return <ShopHome profile={null} />;
		throw error;
	}
	const parsed = parseCatalogSearchParams(await searchParams);
	if (!parsed.success) throw new AppError("VALIDATION_FAILED");
	const result = await listRequesterProducts(actor, parsed.data);
	return <CatalogBrowser filters={parsed.data} result={result} selectable child={actor.profileKind === "CHILD"} />;
}

export default function ProductsPage({ searchParams }: { searchParams: CatalogSearchParams }) {
	return (
		<RequesterFrame wide>
			<Suspense fallback={<CatalogSkeleton />}><ProductsContent searchParams={searchParams} /></Suspense>
		</RequesterFrame>
	);
}

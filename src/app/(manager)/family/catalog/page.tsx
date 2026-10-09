import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { ManagerCatalog } from "@/features/catalog/components/ManagerCatalog/ManagerCatalog";
import { ManagerCatalogSkeleton } from "@/features/catalog/components/ManagerCatalog/ManagerCatalogSkeleton";
import { catalogCopy } from "@/features/catalog/copy";
import { parseCatalogSearchParams } from "@/features/catalog/schemas";
import { listManagerProducts } from "@/features/catalog/server/service";
import type { CatalogSearchParams } from "@/features/catalog/types";
import { requireAdult } from "@/server/auth/require-adult";
import { AppError } from "@/server/errors";
import styles from "./page.module.css";

export const metadata: Metadata = { title: catalogCopy.managerTitle };

type CatalogPageProps = {
	searchParams: CatalogSearchParams;
};

// The header is static and renders at once; filters and demo-priced products stream in.
export default function CatalogPage({ searchParams }: CatalogPageProps) {
	return (
		<div className={styles.page}>
			<PageHeader title={catalogCopy.managerTitle} description={catalogCopy.managerIntro} />
			<Suspense fallback={<ManagerCatalogSkeleton />}>
				<CatalogContent searchParams={searchParams} />
			</Suspense>
		</div>
	);
}

async function CatalogContent({ searchParams }: CatalogPageProps) {
	const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
	const parsed = parseCatalogSearchParams(await searchParams);
	if (!parsed.success) throw new AppError("VALIDATION_FAILED");

	const result = await listManagerProducts(actor, parsed.data);
	return <ManagerCatalog filters={parsed.data} result={result} />;
}

import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { ManagerCatalogSkeleton } from "@/features/catalog/components/ManagerCatalog/ManagerCatalogSkeleton";
import { catalogCopy } from "@/features/catalog/copy";
import styles from "./page.module.css";

// Matches the catalog page: the static header is real, only the catalog is a placeholder.
export default function CatalogLoading() {
	return (
		<div className={styles.page}>
			<PageHeader title={catalogCopy.managerTitle} description={catalogCopy.managerIntro} />
			<ManagerCatalogSkeleton />
		</div>
	);
}

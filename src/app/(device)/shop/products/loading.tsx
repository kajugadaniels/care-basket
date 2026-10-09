import { CatalogSkeleton } from "@/features/catalog/components/CatalogBrowser/CatalogSkeleton";
import { RequesterFrame } from "@/features/devices/components/RequesterFrame/RequesterFrame";

export default function ProductsLoading() {
	return <RequesterFrame wide><CatalogSkeleton /></RequesterFrame>;
}

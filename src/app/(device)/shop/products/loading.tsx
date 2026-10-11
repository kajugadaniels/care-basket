import { ShopLoading } from "@/features/devices/components/ShopLoading/ShopLoading";
import { catalogCopy } from "@/features/catalog/copy";

export default function ProductsLoading() {
	return <ShopLoading label={catalogCopy.loading} />;
}

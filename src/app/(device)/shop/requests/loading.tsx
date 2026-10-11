import { ShopLoading } from "@/features/devices/components/ShopLoading/ShopLoading";
import { requestsCopy } from "@/features/requests/copy";

export default function HistoryLoading() {
	return <ShopLoading label={requestsCopy.loading} />;
}

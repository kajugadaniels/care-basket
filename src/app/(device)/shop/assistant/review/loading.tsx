import { ShopLoading } from "@/features/devices/components/ShopLoading/ShopLoading";
import { assistantCopy } from "@/features/assistant/copy";

export default function ReviewLoading() {
	return <ShopLoading label={assistantCopy.reviewLoading} />;
}

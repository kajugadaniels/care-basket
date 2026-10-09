import { RequesterFrame } from "@/features/devices/components/RequesterFrame/RequesterFrame";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { requestsCopy } from "@/features/requests/copy";

export default function RequestNotFound() {
	return <RequesterFrame><h1>{requestsCopy.unavailable}</h1><ActionLink href="/shop/requests" size="lg">{requestsCopy.back}</ActionLink></RequesterFrame>;
}

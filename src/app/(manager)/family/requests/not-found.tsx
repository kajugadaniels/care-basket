import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { requestsCopy } from "@/features/requests/copy";

export default function RequestNotFound() {
	return <section><h1>{requestsCopy.unavailable}</h1><ActionLink href="/family/requests">{requestsCopy.back}</ActionLink></section>;
}

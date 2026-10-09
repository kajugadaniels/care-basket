import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { ProfileAvatar } from "@/features/profiles/components/ProfileAvatar/ProfileAvatar";
import { catalogCopy } from "@/features/catalog/copy";
import { requestsCopy } from "@/features/requests/copy";
import { devicesCopy } from "../../copy";
import type { ShopHomeDto } from "../../types";
import styles from "./ShopHome.module.css";

export function ShopHome({ profile }: { profile: ShopHomeDto | null }) {
	if (!profile) {
		return (
			<div className={styles.welcome}>
				<h1>{devicesCopy.reconnect}</h1>
				<p>{devicesCopy.reconnectHelp}</p>
				<ActionLink href="/connect" size="lg">{devicesCopy.reconnectAction}</ActionLink>
			</div>
		);
	}

	return (
		<div className={styles.welcome}>
			<div className={styles.greeting}>
				<ProfileAvatar avatarKey={profile.avatarKey} />
				<h1>{devicesCopy.greeting(profile.displayName)}</h1>
			</div>
			<section className={styles.notice}>
				<h2>{devicesCopy.welcome}</h2>
				<p>{devicesCopy.shopping}</p>
				<p>{devicesCopy.reviewNotice}</p>
				<p>{devicesCopy.comingSoon}</p>
			</section>
			<ActionLink href="/shop/products" size="lg">{catalogCopy.browse}</ActionLink>
			<ActionLink href="/shop/basket" size="lg" variant="secondary">{requestsCopy.basket}</ActionLink>
			<ActionLink href="/shop/requests" size="lg" variant="secondary">{requestsCopy.history}</ActionLink>
		</div>
	);
}

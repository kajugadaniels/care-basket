import { ArrowRight01Icon, ShoppingBasket01Icon, Task01Icon } from "@hugeicons/core-free-icons";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Icon } from "@/components/ui/Icon/Icon";
import { ProfileAvatar } from "@/features/profiles/components/ProfileAvatar/ProfileAvatar";
import { catalogCopy } from "@/features/catalog/copy";
import { requestsCopy } from "@/features/requests/copy";
import { assistantCopy } from "@/features/assistant/copy";
import { devicesCopy } from "../../copy";
import type { ShopHomeDto } from "../../types";
import styles from "./ShopHome.module.css";

export function ShopHome({ profile }: { profile: ShopHomeDto | null }) {
	if (!profile) {
		return (
			<div className={`${styles.welcome} ${styles.reconnect}`}>
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
			<div className={styles.workspace}>
				<section className={styles.start} aria-labelledby="shop-start-title">
					<span className={styles.symbol}><Icon icon={ShoppingBasket01Icon} size={48} /></span>
					<h2 id="shop-start-title">{devicesCopy.shopStart}</h2>
					<p>{devicesCopy.shopStartHelp}</p>
					<ActionLink href="/shop/assistant" size="lg" icon={ArrowRight01Icon}>{assistantCopy.title}</ActionLink>
					<p className={styles.reassurance}>{devicesCopy.reviewNotice}</p>
				</section>
				<section className={styles.alternatives} aria-labelledby="shop-other-title">
					<h2 id="shop-other-title">{devicesCopy.shopOtherWays}</h2>
					<div className={styles.option}>
						<p>{devicesCopy.shopPicturesHelp}</p>
						<ActionLink href="/shop/products" size="lg" variant="secondary" icon={ShoppingBasket01Icon}>{catalogCopy.browse}</ActionLink>
					</div>
					<div className={styles.option}>
						<p>{devicesCopy.shopHistoryHelp}</p>
						<ActionLink href="/shop/requests" size="lg" variant="secondary" icon={Task01Icon}>{requestsCopy.history}</ActionLink>
					</div>
				</section>
			</div>
		</div>
	);
}

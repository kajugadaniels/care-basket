import Link from "next/link";
import { Brand } from "@/components/layout/Brand/Brand";
import { Container } from "@/components/layout/Container/Container";
import { cx } from "@/lib/class-names";
import { footerCopy as copy } from "./copy";
import styles from "./PublicFooter.module.css";

type PublicFooterProps = {
	audience?: "public" | "requester";
};

export function PublicFooter({ audience = "public" }: PublicFooterProps) {
	const isRequester = audience === "requester";
	const description = isRequester ? copy.requesterDescription : copy.description;

	return (
		<footer className={cx(styles.footer, isRequester && styles.requester)}>
			<Container className={styles.inner}>
				<div className={styles.intro}>
					<Brand />
					<p className={styles.description}>{description}</p>
				</div>

				<nav aria-label={copy.navigationLabel} className={styles.navigation}>
					<ul role="list" className={styles.links}>
						{copy.links.map((item) => (
							<li key={item.href}>
								<Link href={item.href} className={styles.link}>
									{item.label}
								</Link>
							</li>
						))}
					</ul>
				</nav>
			</Container>
		</footer>
	);
}

import Link from "next/link";
import { Brand } from "@/components/layout/Brand/Brand";
import { Container } from "@/components/layout/Container/Container";
import { footerCopy as copy } from "./copy";
import styles from "./PublicFooter.module.css";

export function PublicFooter() {
	return (
		<footer className={styles.footer}>
			<Container className={styles.inner}>
				<div className={styles.intro}>
					<Brand />
					<p className={styles.description}>{copy.description}</p>
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

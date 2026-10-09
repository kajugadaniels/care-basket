import Link from "next/link";
import { Brand } from "@/components/layout/Brand/Brand";
import { Container } from "@/components/layout/Container/Container";
import { PublicFooter } from "@/components/layout/PublicFooter/PublicFooter";
import { SkipLink } from "@/components/ui/SkipLink/SkipLink";
import { CATALOG_DATASET_URL, CATALOG_MARKET } from "@/features/catalog/config";
import { dataSourcesCopy as copy } from "@/features/catalog/data-sources-copy";
import styles from "./page.module.css";

export const metadata = { title: copy.title };

export default function DataSourcesPage() {
	return (
		<>
			<header><SkipLink targetId="main-content" /><Container><Brand href="/" /></Container></header>
			<Container>
				<main id="main-content" tabIndex={-1} className={styles.page}>
					<h1>{copy.title}</h1>
					<p>{copy.intro}</p>
					<section className={styles.section} aria-labelledby="source-products">
						<h2 id="source-products">{copy.productsTitle}</h2>
						<p>{copy.products}</p>
						<ul className={styles.links}>
							<li><a href="https://prices.openfoodfacts.org/">Open Prices</a></li>
							<li><a href="https://world.openfoodfacts.org/">Open Food Facts</a></li>
						</ul>
					</section>
					<section className={styles.section} aria-labelledby="source-prices">
						<h2 id="source-prices">{copy.pricesTitle}</h2>
						<p>{copy.prices}</p><p>{copy.store(CATALOG_MARKET.merchantName)}</p>
					</section>
					<section className={styles.section} aria-labelledby="source-licenses">
						<h2 id="source-licenses">{copy.licensesTitle}</h2>
						<p>{copy.licenses}</p><p>{copy.review}</p>
						<ul className={styles.links}>
							<li><a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL 1.0</a></li>
							<li><a href="https://opendatacommons.org/licenses/dbcl/1-0/">DbCL 1.0</a></li>
							<li><a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a></li>
							<li><a href={CATALOG_DATASET_URL}>{copy.download}</a></li>
							<li><a href="/products/ATTRIBUTION.md">{copy.images}</a></li>
						</ul>
					</section>
					<p>{copy.privacy}</p>
					<Link href="/">{copy.home}</Link>
				</main>
			</Container>
			<PublicFooter />
		</>
	);
}

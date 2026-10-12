import Link from "next/link";
import { Brand } from "@/components/layout/Brand/Brand";
import { Container } from "@/components/layout/Container/Container";
import { PublicFooter } from "@/components/layout/PublicFooter/PublicFooter";
import { SkipLink } from "@/components/ui/SkipLink/SkipLink";
import { privacyCopy as copy } from "@/features/privacy/copy";
import styles from "./page.module.css";

export const metadata = { title: copy.title, description: copy.description };

// Public, static content: no authentication, family lookup or provider request.
export default function PrivacyPage() {
	return (
		<>
			<header className={styles.header}>
				<SkipLink targetId="main-content" />
				<Container><Brand href="/" /></Container>
			</header>
			<Container>
				<main id="main-content" tabIndex={-1} className={styles.page}>
					<div className={styles.intro}>
						<h1>{copy.title}</h1>
						<p className={styles.updated}>{copy.updated}</p>
						<p>{copy.intro}</p>
					</div>
					{copy.sections.map((section) => (
						<section key={section.id} aria-labelledby={`privacy-${section.id}`} className={styles.section}>
							<h2 id={`privacy-${section.id}`}>{section.title}</h2>
							{section.paragraphs.map((paragraph) => (
								<p key={paragraph}>{paragraph}</p>
							))}
						</section>
					))}
					<section aria-labelledby="privacy-retention" className={styles.section}>
						<h2 id="privacy-retention">{copy.retentionTitle}</h2>
						<p>{copy.retentionIntro}</p>
						<dl className={styles.retention}>
							{copy.retention.map((item) => (
								<div key={item.name}>
									<dt>{item.name}</dt>
									<dd>{item.period}</dd>
								</div>
							))}
						</dl>
					</section>
					<section aria-labelledby="privacy-deletion" className={styles.section}>
						<h2 id="privacy-deletion">{copy.deletionTitle}</h2>
						<p>{copy.deletion}</p>
						<p>
							{copy.contact}: <a href={`mailto:${copy.email}`}>{copy.email}</a>
						</p>
						<p>{copy.contactHint}</p>
					</section>
					<Link href="/">{copy.home}</Link>
				</main>
			</Container>
			<PublicFooter />
		</>
	);
}

"use client";

import { useState } from "react";
import type { IconSvgElement } from "@hugeicons/react";
import {
	ArrowLeft01Icon,
	ArrowRight01Icon,
	SecurityCheckIcon,
	ShoppingBasket01Icon,
	UserMultiple02Icon,
} from "@hugeicons/core-free-icons";
import { Container } from "@/components/layout/Container/Container";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { RequestPreview } from "@/features/landing/components/RequestPreview/RequestPreview";
import { landingCopy, type LandingSlideId } from "@/features/landing/copy";
import { cx } from "@/lib/class-names";
import styles from "./LandingStory.module.css";

const SLIDE_ICONS: Record<LandingSlideId, IconSvgElement> = {
	welcome: ShoppingBasket01Icon,
	"how-it-works": ArrowRight01Icon,
	families: UserMultiple02Icon,
	trust: SecurityCheckIcon,
};

export function LandingStory() {
	const [current, setCurrent] = useState(0);
	const slide = landingCopy.slides[current];
	const isFirst = current === 0;
	const isLast = current === landingCopy.slides.length - 1;
	const Heading = isFirst ? "h1" : "h2";

	return (
		<section className={styles.story} aria-label={landingCopy.carouselLabel} aria-roledescription="carousel">
			<Container className={styles.shell}>
				<p className={styles.progress} aria-live="polite" aria-atomic="true">
					{landingCopy.slideStatus({ current: current + 1, total: landingCopy.slides.length, label: slide.label })}
				</p>

				<div className={cx(styles.slide, isFirst && styles.hero)} role="group" aria-roledescription="slide"
					aria-labelledby={`${slide.id}-title`}>
					<div className={styles.copy}>
						<span className={styles.icon} aria-hidden="true"><Icon icon={SLIDE_ICONS[slide.id]} size={28} /></span>
						<Heading id={`${slide.id}-title`} className={styles.title}>{slide.title}</Heading>
						<p className={styles.description}>{slide.description}</p>
						{isFirst ? (
							<ul role="list" className={styles.ways}>
								{slide.items.map((item) => <li key={item.id}>{item.title}</li>)}
							</ul>
						) : null}
					</div>

					{isFirst ? <RequestPreview /> : (
						<ul role="list" className={styles.items}>
							{slide.items.map((item, index) => (
								<li key={item.id} className={styles.item}>
									<span className={styles.itemNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
									<div><h3>{item.title}</h3>{"description" in item ? <p>{item.description}</p> : null}</div>
								</li>
							))}
						</ul>
					)}
				</div>

				<nav className={styles.controls} aria-label="Landing page slides">
					<Button size="xs" variant="secondary" icon={ArrowLeft01Icon} disabled={isFirst}
						onClick={() => setCurrent((index) => Math.max(0, index - 1))}>{landingCopy.previous}</Button>
					<ol className={styles.steps}>
						{landingCopy.slides.map((item, index) => (
							<li key={item.id}>
								<button type="button" className={styles.step} aria-current={index === current ? "step" : undefined}
									aria-label={landingCopy.showSlide(item.label)} onClick={() => setCurrent(index)}>
									<span className={styles.stepNumber}>{index + 1}</span><span className={styles.stepLabel}>{item.label}</span>
								</button>
							</li>
						))}
					</ol>
					<Button size="xs" variant="secondary" icon={ArrowRight01Icon} disabled={isLast}
						onClick={() => setCurrent((index) => Math.min(landingCopy.slides.length - 1, index + 1))}>{landingCopy.next}</Button>
				</nav>
			</Container>
		</section>
	);
}

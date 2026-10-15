"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
	ArrowLeft01Icon,
	ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { Container } from "@/components/layout/Container/Container";
import { Button } from "@/components/ui/Button/Button";
import { RequestPreview } from "@/features/landing/components/RequestPreview/RequestPreview";
import { landingCopy } from "@/features/landing/copy";
import { useLandingPlayback } from "../../hooks/use-landing-playback";
import styles from "./LandingStory.module.css";

export function LandingStory() {
	const [current, setCurrent] = useState(0);
	const slide = landingCopy.slides[current];
	const isFirst = current === 0;
	const isLast = current === landingCopy.slides.length - 1;
	const playback = useLandingPlayback(current, setCurrent, landingCopy.slides.length);
	const playbackButton = useRef<HTMLDivElement>(null);

	function selectSlide(index: number) {
		playback.setPaused(true);
		setCurrent(index);
	}

	return (
		<section className={styles.story} aria-label={landingCopy.carouselLabel} aria-roledescription="carousel"
			onMouseEnter={() => playback.setHovered(true)}
			onMouseLeave={() => playback.setHovered(false)}
			onFocusCapture={(event) => {
				if (!playbackButton.current?.contains(event.target)) playback.setPaused(true);
			}}>
			<div className={styles.backdrop} aria-hidden="true">
				{landingCopy.slides.map((item, index) => (
					<Image
						key={item.id}
						src={item.image}
						alt=""
						fill
						sizes="100vw"
						preload={index === 0}
						className={styles.backgroundImage}
						style={{ opacity: index === current ? 1 : 0 }}
						data-active={index === current}
					/>
				))}
			</div>
			<Container className={styles.shell}>
				<div className={styles.progressRow}>
					<p className={styles.progress} aria-live={playback.playing ? "off" : "polite"} aria-atomic="true">
						{landingCopy.slideStatus({ current: current + 1, total: landingCopy.slides.length, label: slide.label })}
					</p>
					<div ref={playbackButton}>
						<Button className={styles.playback} variant="secondary" size="sm"
							disabled={playback.reducedMotion}
							onClick={() => playback.setPaused((paused) => !paused)}>
							{playback.reducedMotion ? landingCopy.manualPlayback : playback.paused ? landingCopy.resume : landingCopy.pause}
						</Button>
					</div>
				</div>

				<div key={slide.id} className={styles.slide} role="group" aria-roledescription="slide"
					aria-labelledby={`${slide.id}-title`}>
					<div className={styles.copy}>
						<h1 id={`${slide.id}-title`} className={styles.title}>{slide.title}</h1>
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
					<Button className={styles.arrow} size="xs" variant="secondary" icon={ArrowLeft01Icon} disabled={isFirst}
						onClick={() => selectSlide(Math.max(0, current - 1))}>{landingCopy.previous}</Button>
					<ol className={styles.steps}>
						{landingCopy.slides.map((item, index) => (
							<li key={item.id}>
								<button type="button" className={styles.step} aria-current={index === current ? "step" : undefined}
									aria-label={landingCopy.showSlide(item.label)} onClick={() => selectSlide(index)}>
									<span className={styles.stepNumber}>{index + 1}</span><span className={styles.stepLabel}>{item.label}</span>
								</button>
							</li>
						))}
					</ol>
					<Button className={styles.arrow} size="xs" variant="secondary" icon={ArrowRight01Icon} disabled={isLast}
						onClick={() => selectSlide(Math.min(landingCopy.slides.length - 1, current + 1))}>{landingCopy.next}</Button>
				</nav>
			</Container>
		</section>
	);
}

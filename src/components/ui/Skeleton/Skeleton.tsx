import { cx } from "@/lib/class-names";
import styles from "./Skeleton.module.css";

type SkeletonShape = "text" | "heading" | "box" | "pill";

const shapeClasses: Record<SkeletonShape, string> = {
	text: styles.text,
	heading: styles.heading,
	box: styles.box,
	pill: styles.pill,
};

type SkeletonProps = {
	shape?: SkeletonShape;
	className?: string;
};

// A placeholder for content that is still loading. Text shapes take the line height of the
// font size they inherit, so callers reuse the real content's classes to keep the layout exact.
// Hidden from assistive technology: LoadingState announces the loading instead.
export function Skeleton({ shape = "text", className }: SkeletonProps) {
	return <span className={cx(styles.skeleton, shapeClasses[shape], className)} aria-hidden="true" />;
}

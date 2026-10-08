import styles from "./SectionHeading.module.css";

type SectionHeadingProps = {
  // Referenced by the parent section's aria-labelledby.
  id: string;
  title: string;
  description?: string;
};

export function SectionHeading({ id, title, description }: SectionHeadingProps) {
  return (
    <hgroup className={styles.heading}>
      <h2 id={id} className={styles.title}>
        {title}
      </h2>
      {description ? <p className={styles.description}>{description}</p> : null}
    </hgroup>
  );
}

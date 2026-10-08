import { devicesCopy } from "@/features/devices/copy";
import styles from "./page.module.css";
export default function DevicesLoading() { return <div className={styles.page} aria-busy="true"><div className={styles.loading} role="status">{devicesCopy.loading}</div></div>; }

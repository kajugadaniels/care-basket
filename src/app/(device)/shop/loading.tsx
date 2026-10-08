import { RequesterFrame } from "@/features/devices/components/RequesterFrame/RequesterFrame";
import { devicesCopy } from "@/features/devices/copy";
import styles from "@/features/devices/components/RequesterFrame/RequesterFrame.module.css";
export default function ShopLoading() { return <RequesterFrame><div role="status" aria-busy="true" className={styles.loading}>{devicesCopy.loading}</div></RequesterFrame>; }

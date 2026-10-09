"use client";
import { Button } from "@/components/ui/Button/Button";
import { devicesCopy } from "@/features/devices/copy";
import styles from "./page.module.css";
export default function DevicesError({ retry }: { retry(): void }) { return <div className={styles.page}><h1 className={styles.title}>{devicesCopy.errorTitle}</h1><p role="alert">{devicesCopy.errorText}</p><Button onClick={retry}>{devicesCopy.retry}</Button></div>; }

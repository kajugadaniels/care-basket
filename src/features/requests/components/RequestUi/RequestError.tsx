"use client";

import { Button } from "@/components/ui/Button/Button";
import { requestsCopy } from "../../copy";
import styles from "./RequestUi.module.css";

export function RequestError({ retry }: { retry: () => void }) {
	return <div className={styles.page}><h1>{requestsCopy.errorTitle}</h1>
		<p role="alert">{requestsCopy.errorHelp}</p><Button onClick={retry}>{requestsCopy.retry}</Button>
	</div>;
}

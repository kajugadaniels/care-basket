import type { ReactNode } from "react";
import { PublicFooter } from "@/components/layout/PublicFooter/PublicFooter";
import styles from "./layout.module.css";

export default function ManagerLayout({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<>
			{children}
			<div className={styles.footer}>
				<PublicFooter />
			</div>
		</>
	);
}

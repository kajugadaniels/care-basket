import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { devicesCopy } from "../../copy";
import styles from "./ReconnectDevice.module.css";

export function ReconnectDevice() {
	return (
		<div className={styles.panel}>
			<h1>{devicesCopy.reconnect}</h1>
			<p>{devicesCopy.reconnectHelp}</p>
			<ActionLink href="/connect" size="lg">{devicesCopy.reconnectAction}</ActionLink>
		</div>
	);
}

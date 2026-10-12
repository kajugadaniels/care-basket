import type { ReactNode } from "react";
import { PublicFooter } from "@/components/layout/PublicFooter/PublicFooter";

// Keep static footer chrome outside the shop's device-session and draft boundaries.
export default function DeviceLayout({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<>
			{children}
			<PublicFooter audience="requester" />
		</>
	);
}

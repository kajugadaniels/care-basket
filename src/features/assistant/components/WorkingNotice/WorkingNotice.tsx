"use client";

import { useEffect, useState } from "react";
import { LoadingState } from "@/components/ui/LoadingState/LoadingState";
import { assistantCopy } from "../../copy";

export function WorkingNotice() {
	const [slow, setSlow] = useState(false);
	useEffect(() => {
		const timer = setTimeout(() => setSlow(true), 6000);
		return () => clearTimeout(timer);
	}, []);
	return (
		<LoadingState label={slow ? assistantCopy.slow : assistantCopy.working}>
			{slow ? <p aria-hidden="true">{assistantCopy.slow}</p> : null}
		</LoadingState>
	);
}

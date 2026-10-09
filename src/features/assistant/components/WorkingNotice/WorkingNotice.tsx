"use client";

import { useEffect, useState } from "react";
import { assistantCopy } from "../../copy";

export function WorkingNotice() {
	const [slow, setSlow] = useState(false);
	useEffect(() => {
		const timer = setTimeout(() => setSlow(true), 6000);
		return () => clearTimeout(timer);
	}, []);
	return <p role="status">{slow ? assistantCopy.slow : assistantCopy.working}</p>;
}

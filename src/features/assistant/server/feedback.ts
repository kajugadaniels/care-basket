import "server-only";

import type { ActionFeedback } from "@/types/action-result";
import { assistantCopy } from "../copy";
import type { Proposal } from "../types";

export function proposalFeedback(proposal: Proposal): ActionFeedback {
	if (proposal.unrecognized.length) {
		return {
			kind: "warning",
			message: assistantCopy.unrecognized({ phrases: proposal.unrecognized }),
		};
	}

	return { kind: "success", message: assistantCopy.understood };
}

import "server-only";
import { CatalogSourceError } from "@/lib/catalog-http/client";

export type DiscoveryPhase = "options" | "configuration" | "sources" | "report";

// Raw error messages can contain environment values, URLs, or provider payloads.
export function describeDiscoveryFailure(error: unknown, phase: DiscoveryPhase): string {
	if (phase === "options") {
		return "Invalid CLI options. Use --pages 1–5, --candidates 1–200, and --enrichments 0–100.";
	}
	if (phase === "configuration") {
		return "Missing or invalid CATALOG_USER_AGENT. Set it to CareBasket/<version> (<contact email>) in the selected environment file (.env.local by default; .env.production for NODE_ENV=production). Existing shell variables take precedence.";
	}
	if (phase === "report") {
		return "Could not write the candidate report. Check write permissions and available disk space for .catalog-output in the project directory.";
	}
	if (error instanceof CatalogSourceError) {
		switch (error.reason) {
			case "ABORTED":
				return "Discovery was cancelled before the source requests completed.";
			case "NETWORK":
				return "Source network request failed after bounded retries. Check connectivity, DNS, TLS, and source availability; requests time out after 15 seconds.";
			case "INVALID_RESPONSE":
				return "A source returned invalid JSON, an oversized response, or data that did not match the expected schema. Source validation remains enabled.";
			case "HTTP": {
				const status = error.status;
				const label = status !== undefined && Number.isInteger(status) && status >= 100 && status <= 599
					? `HTTP ${status}`
					: "HTTP error";
				return `${label} from a catalog source. Check source availability and request compatibility. For HTTP 429, wait before rerunning; source rate limits and Retry-After are respected.`;
			}
		}
	}
	return "Unexpected failure during source discovery. No raw error details were logged; inspect the discovery logic locally.";
}

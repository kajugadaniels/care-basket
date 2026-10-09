import "server-only";
import { config } from "dotenv";

// Developer-run scripts use the same single-environment loading policy as Prisma CLI.
export function loadScriptEnvironment() {
	const file = process.env.NODE_ENV === "production" ? ".env.production" : ".env.local";
	config({ path: file, quiet: true });
}

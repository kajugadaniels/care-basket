import "server-only";

export type SeedPhase = "input" | "images" | "database";

const DATABASE_FAILURES: ReadonlyArray<{
	codes: readonly string[];
	message: string;
}> = [
	{
		codes: ["P2021", "42P01", "TableDoesNotExist"],
		message: "A required catalog table is missing. Check Prisma migration status and apply pending migrations to the same database and branch used by DATABASE_URL. DIRECT_URL must target that same database and branch.",
	},
	{
		codes: ["P2022", "42703", "ColumnNotFound"],
		message: "A required catalog column is missing. Check applied migrations and regenerate the Prisma client if it is out of date. DATABASE_URL and DIRECT_URL must target the same database and branch.",
	},
	{
		codes: ["P1000", "28P01", "AuthenticationFailed"],
		message: "Database authentication failed. Check DATABASE_URL credentials in the selected environment file and any overriding shell variable. Do not share the connection string.",
	},
	{
		codes: ["P1001", "ENOTFOUND", "ECONNREFUSED", "DatabaseNotReachable"],
		message: "The database could not be reached. Check connectivity, DNS, and the configured database host and branch.",
	},
	{
		codes: ["P1002", "ETIMEDOUT", "SocketTimeout"],
		message: "The database connection timed out. Check connectivity and database availability before rerunning.",
	},
	{
		codes: ["P1011", "TlsConnectionError", "CERT_HAS_EXPIRED", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "SELF_SIGNED_CERT_IN_CHAIN", "ERR_TLS_CERT_ALTNAME_INVALID"],
		message: "Database TLS verification failed. Check the certificate trust chain and hostname. Preserve certificate verification; do not disable TLS checks.",
	},
	{
		codes: ["P1003", "3D000", "DatabaseDoesNotExist"],
		message: "The configured database does not exist. Check the database name and branch in DATABASE_URL.",
	},
	{
		codes: ["P1010", "28000", "42501", "DatabaseAccessDenied"],
		message: "The database role lacks access. Check its database, schema, and catalog table permissions.",
	},
	{
		codes: ["P2002", "23505", "UniqueConstraintViolation"],
		message: "A catalog identity conflicts with an existing database record. Review SKU, barcode, and source identities before rerunning; do not delete existing records automatically.",
	},
	{
		codes: ["P2003", "23503", "ForeignKeyConstraintViolation"],
		message: "A catalog relationship violates a database constraint. Check the applied schema and existing catalog records.",
	},
	{
		codes: ["P2024", "53300", "TooManyConnections"],
		message: "The database connection limit or pool wait limit was reached. Check active connections and pooled DATABASE_URL configuration before rerunning.",
	},
	{
		codes: ["P1017", "ECONNRESET", "ConnectionClosed"],
		message: "The database closed the connection. Check database availability and connectivity before rerunning.",
	},
	{
		codes: ["P2028"],
		message: "The catalog transaction failed or expired. Check database availability and transaction limits before rerunning.",
	},
	{
		codes: ["PrismaClientValidationError"],
		message: "The catalog query does not match the generated Prisma client. Regenerate the client from the current schema and check the applied migrations.",
	},
];

function databaseDiagnostic(error: unknown): string | undefined {
	const pending: unknown[] = [error];
	const visited = new Set<object>();
	// Prisma adapter failures can nest SQLSTATE codes beneath meta.driverAdapterError.cause.
	// Inspect only known wrapper keys, with a bound for malformed or cyclic errors.
	for (let index = 0; index < pending.length && index < 16; index += 1) {
		const value = pending[index];
		if (typeof value !== "object" || value === null || visited.has(value)) continue;
		visited.add(value);
		const record = value as Record<string, unknown>;
		const identifiers = [record.code, record.originalCode, record.kind, record.name];
		const match = DATABASE_FAILURES.find(({ codes }) => identifiers.some(
			(identifier) => typeof identifier === "string" && codes.includes(identifier),
		));
		if (match) return match.message;
		for (const key of ["cause", "meta", "driverAdapterError", "error"]) {
			pending.push(record[key]);
		}
	}
	return undefined;
}

export function describeSeedFailure(error: unknown, phase: SeedPhase): string {
	if (phase === "input") {
		return "Could not load or validate prisma/catalog/catalog.us.json. Check the JSON file and selected environment file. No database writes were made.";
	}
	if (phase === "images") {
		return "A curated local image is missing, unreadable, empty, or larger than 2 MB. Check referenced files under public/products. No database writes were made.";
	}
	// Never log raw messages, stacks, SQL, driver metadata, URLs, or environment values.
	const diagnostic = databaseDiagnostic(error)
		?? "Unclassified database-stage failure. Check DATABASE_URL, applied migrations, and generated Prisma client configuration locally. Raw error details were withheld to protect credentials.";
	return `${diagnostic} Earlier products may have been committed; rerunning is safe after resolving the cause. No source APIs were called.`;
}

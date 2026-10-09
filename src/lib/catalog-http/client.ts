import "server-only";

export class CatalogSourceError extends Error {
	constructor(public readonly reason: "NETWORK" | "HTTP" | "INVALID_RESPONSE" | "ABORTED", public readonly status?: number) {
		super(`Catalog source unavailable (${reason}${status ? `, HTTP ${status}` : ""}). No catalog data was changed.`);
		this.name = "CatalogSourceError";
	}
}

type ClientOptions = {
	host: "prices.openfoodfacts.org" | "world.openfoodfacts.org";
	userAgent: string;
	intervalMs: number;
	fetcher?: typeof fetch;
	now?: () => number;
	wait?: (ms: number, signal?: AbortSignal) => Promise<void>;
	random?: () => number;
};

function delay(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) return reject(new CatalogSourceError("ABORTED"));
		const abort = () => {
			clearTimeout(timer);
			reject(new CatalogSourceError("ABORTED"));
		};
		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", abort);
			resolve();
		}, ms);
		signal?.addEventListener("abort", abort, { once: true });
	});
}

export function retryAfterMilliseconds(header: string | null, now: number): number {
	if (!header) return 0;
	if (/^\d+$/.test(header.trim())) return Number(header) * 1000;
	const time = Date.parse(header);
	return Number.isFinite(time) ? Math.max(0, time - now) : 0;
}

async function readJson(response: Response): Promise<unknown> {
	const maximumBytes = 2 * 1024 * 1024;
	if (Number(response.headers.get("content-length")) > maximumBytes || !response.body) {
		await response.body?.cancel();
		throw new CatalogSourceError("INVALID_RESPONSE");
	}
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let bytes = 0;
	let text = "";
	try {
		while (true) {
			const chunk = await reader.read();
			if (chunk.done) break;
			bytes += chunk.value.byteLength;
			if (bytes > maximumBytes) throw new CatalogSourceError("INVALID_RESPONSE");
			text += decoder.decode(chunk.value, { stream: true });
		}
		return JSON.parse(text + decoder.decode()) as unknown;
	} catch (error) {
		if (error instanceof CatalogSourceError) throw error;
		throw new CatalogSourceError("INVALID_RESPONSE");
	} finally {
		await reader.cancel().catch(() => undefined);
		reader.releaseLock();
	}
}

// Queue belongs to a single CLI client, not shared mutable application state.
export function createCatalogHttpClient(options: ClientOptions) {
	const fetcher = options.fetcher ?? fetch;
	const now = options.now ?? Date.now;
	const wait = options.wait ?? delay;
	const random = options.random ?? Math.random;
	let nextRequestAt = 0;
	let queue: Promise<unknown> = Promise.resolve();

	async function request(path: string, query: Record<string, string>, signal?: AbortSignal): Promise<unknown> {
		const url = new URL(path, `https://${options.host}`);
		if (url.hostname !== options.host || url.protocol !== "https:" || url.username || url.password) {
			throw new CatalogSourceError("INVALID_RESPONSE");
		}
		url.search = new URLSearchParams(query).toString();
		for (let attempt = 0; attempt < 3; attempt += 1) {
			if (signal?.aborted) throw new CatalogSourceError("ABORTED");
			await wait(Math.max(0, nextRequestAt - now()), signal);
			nextRequestAt = now() + options.intervalMs;
			let response: Response;
			try {
				response = await fetcher(url, {
					headers: { "User-Agent": options.userAgent, Accept: "application/json" },
					redirect: "error",
					signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000),
				});
			} catch {
				if (signal?.aborted) throw new CatalogSourceError("ABORTED");
				if (attempt === 2) throw new CatalogSourceError("NETWORK");
				await wait(1000 * 2 ** attempt + Math.floor(random() * 250), signal);
				continue;
			}
			if (response.ok) return readJson(response);
			await response.body?.cancel();
			if (response.status !== 429 && response.status < 500) throw new CatalogSourceError("HTTP", response.status);
			if (attempt === 2) throw new CatalogSourceError("HTTP", response.status);
			const retryAfter = retryAfterMilliseconds(response.headers.get("retry-after"), now());
			// A longer server-requested cooldown aborts this run; never retry earlier than requested.
			if (retryAfter > 60_000) throw new CatalogSourceError("HTTP", response.status);
			await wait(Math.max(retryAfter, 1000 * 2 ** attempt + Math.floor(random() * 250)), signal);
		}
		throw new CatalogSourceError("NETWORK");
	}

	return {
		get(path: string, query: Record<string, string> = {}, signal?: AbortSignal) {
			const result = queue.then(() => request(path, query, signal));
			queue = result.catch(() => undefined);
			return result;
		},
	};
}

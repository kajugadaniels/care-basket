import { z } from "zod";

// Convert decimal text using digits, never price * 100 floating-point arithmetic.
export function decimalToMinor(value: number | string): number | null {
	const text = String(value);
	const match = /^(\d{1,3})(?:\.(\d{1,8}))?$/.exec(text);
	if (!match) return null;
	const fraction = (match[2] ?? "").padEnd(3, "0");
	const minor = Number(match[1]) * 100 + Number(fraction.slice(0, 2)) + (Number(fraction[2]) >= 5 ? 1 : 0);
	return minor > 0 && minor <= 50_000 ? minor : null;
}

export function isCalendarDate(value: string): boolean {
	return z.iso.date().safeParse(value).success;
}

export function observationCutoff(today: string): string {
	const [year, month, day] = today.split("-").map(Number);
	const lastDay = new Date(Date.UTC(year - 2, month, 0)).getUTCDate();
	return `${year - 2}-${String(month).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

export type VerifiedObservation = {
	sourcePriceId: number;
	productCode: string;
	priceMinor: number;
	currency: "USD";
	observedOn: string;
	isDiscounted: boolean;
	locationId: number;
	locationCountryCode: "US";
};

export function suggestDemoPrice(observations: VerifiedObservation[], today: string) {
	const unique = new Map(observations.map((observation) => [observation.sourcePriceId, observation]));
	const eligible = [...unique.values()].filter((observation) =>
		!observation.isDiscounted && observation.observedOn >= observationCutoff(today) && observation.observedOn <= today,
	);
	if (eligible.length === 0) return null;
	const amounts = eligible.map((observation) => observation.priceMinor).sort((a, b) => a - b);
	const middle = Math.floor(amounts.length / 2);
	const priceMinor = amounts.length % 2 === 1 ? amounts[middle] : Math.floor((amounts[middle - 1] + amounts[middle] + 1) / 2);
	const dates = eligible.map((observation) => observation.observedOn).sort();
	return {
		priceMinor,
		basis: eligible.length >= 3 ? "OBSERVED_MEDIAN" as const : "OBSERVED_LIMITED" as const,
		observationCount: eligible.length,
		observedFrom: dates[0],
		observedTo: dates[dates.length - 1],
	};
}

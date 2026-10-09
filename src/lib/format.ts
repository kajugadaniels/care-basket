// A fixed time zone keeps server/client output stable and avoids changing calendar dates.
export function formatDate(value: string, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long", timeZone: "UTC",
  }).format(new Date(value));
}

export function formatTime(value: string, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: "short", timeZone: "UTC" }).format(new Date(value));
}

export function formatCountdown(milliseconds: number, locale = "en-US"): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const digits = new Intl.NumberFormat(locale, { minimumIntegerDigits: 2, useGrouping: false });
  return `${digits.format(Math.floor(seconds / 60))}:${digits.format(seconds % 60)}`;
}

export function formatMoney(priceMinor: number, currency: string, locale = "en-US"): string {
	if (!Number.isSafeInteger(priceMinor) || priceMinor < 0) throw new Error("Money must be nonnegative integer cents.");
	return new Intl.NumberFormat(locale, { style: "currency", currency }).format(priceMinor / 100);
}

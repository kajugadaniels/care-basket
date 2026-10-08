// A fixed time zone keeps server/client output stable and avoids changing calendar dates.
export function formatDate(value: string, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long", timeZone: "UTC",
  }).format(new Date(value));
}

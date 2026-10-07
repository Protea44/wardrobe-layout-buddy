// "2026-03-14" or an ISO timestamp as "14.03.2026". Date-only values are read
// as calendar dates, so no time zone can shift them by a day.
export function formatDate(value: string) {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00Z` : value);
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(dateOnly && { timeZone: "UTC" }),
  }).format(date);
}

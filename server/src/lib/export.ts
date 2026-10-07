import type { ItemResponse } from "@shared/item";

const SEASON_LABELS: Record<string, string> = {
  fruehling: "Frühling",
  sommer: "Sommer",
  herbst: "Herbst",
  winter: "Winter",
  ganzjaehrig: "Ganzjährig",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Im Schrank",
  SORTED_OUT: "Aussortiert",
  SOLD: "Verkauft",
  GIVEN_AWAY: "Verschenkt",
};

// "2026-03-14" or a timestamp as "14.03.2026" (German calendar date).
function germanDate(value: string | null) {
  if (value === null) return "";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}.${month}.${year}`;
}

// One CSV cell. Text that Excel would run as a formula gets a leading
// apostrophe; separators, quotes and line breaks are quoted.
export function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const COLUMNS: [string, (item: ItemResponse) => string][] = [
  ["ID", (item) => item.id],
  ["Name", (item) => item.name],
  ["Kategorie", (item) => item.category],
  ["Farbe", (item) => item.color ?? ""],
  ["Marke", (item) => item.brand ?? ""],
  ["Größe", (item) => item.size ?? ""],
  ["Preis (€)", (item) => item.price?.replace(".", ",") ?? ""],
  ["Kaufdatum", (item) => germanDate(item.purchaseDate)],
  ["Material", (item) => item.material ?? ""],
  ["Händler", (item) => item.retailer ?? ""],
  ["Saison", (item) => item.seasons.map((season) => SEASON_LABELS[season] ?? season).join(", ")],
  ["Notiz", (item) => item.notes ?? ""],
  ["Status", (item) => STATUS_LABELS[item.lifecycleStatus] ?? item.lifecycleStatus],
  ["Sichtbarkeit", (item) => (item.visibility === "PRIVATE" ? "Privat" : item.visibility)],
  ["Hinzugefügt am", (item) => germanDate(item.createdAt)],
  ["Beleg-ID", (item) => item.receiptId ?? ""],
];

// kleidung.csv: one row per item, semicolons, CRLF and a BOM so Excel reads
// it as UTF-8.
export function itemsCsv(items: ItemResponse[]) {
  const rows = [
    COLUMNS.map(([header]) => header),
    ...items.map((item) => COLUMNS.map(([, value]) => value(item))),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}\r\n`;
}

// kleiderschrank-kompakt-export-YYYY-MM-DD.zip, dated in German time.
export function exportFilename(now = new Date()) {
  const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(now);
  return `kleiderschrank-kompakt-export-${date}.zip`;
}

// Last segment of a storage key, which is already a safe file name.
export function keyFilename(key: string) {
  return key.split("/").pop() ?? "datei";
}

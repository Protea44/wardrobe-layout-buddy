import { describe, expect, it } from "vitest";

import { csvCell, exportFilename, itemsCsv } from "./export";

describe("csvCell", () => {
  it("quotes separators, quotes and line breaks", () => {
    expect(csvCell("Hemd")).toBe("Hemd");
    expect(csvCell("a;b")).toBe('"a;b"');
    expect(csvCell('sagt "hallo"')).toBe('"sagt ""hallo"""');
    expect(csvCell("Zeile 1\nZeile 2")).toBe('"Zeile 1\nZeile 2"');
  });

  it("defuses text that Excel would run as a formula", () => {
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell("+49 170")).toBe("'+49 170");
    expect(csvCell("-5")).toBe("'-5");
    expect(csvCell("@cmd")).toBe("'@cmd");
  });
});

describe("exportFilename", () => {
  it("uses the German calendar date", () => {
    // 23:30 UTC on 31 December is already 1 January in Germany.
    expect(exportFilename(new Date("2026-12-31T23:30:00Z"))).toBe(
      "kleiderschrank-kompakt-export-2027-01-01.zip",
    );
  });
});

describe("itemsCsv", () => {
  it("starts with a UTF-8 BOM and uses semicolons and CRLF", () => {
    const csv = Buffer.from(itemsCsv([]), "utf8");

    expect([...csv.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(csv.subarray(3).toString("utf8")).toMatch(/^ID;Name;Kategorie;.*\r\n$/);
  });
});

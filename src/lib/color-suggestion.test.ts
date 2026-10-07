import { describe, expect, it } from "vitest";

import { colorName, suggestColor } from "@/lib/color-suggestion";

type Rgb = [number, number, number];

// Builds RGBA pixel data from [color, count] runs.
function pixels(...runs: [Rgb, number][]) {
  const data = runs.flatMap(([[r, g, b], count]) =>
    Array.from({ length: count }, () => [r, g, b, 255]).flat(),
  );
  return Uint8ClampedArray.from(data);
}

describe("colorName", () => {
  it.each<[Rgb, string]>([
    [[11, 31, 58], "Navy"],
    [[30, 80, 200], "Blau"],
    [[173, 216, 230], "Blau"],
    [[200, 30, 40], "Rot"],
    [[128, 0, 32], "Rot"],
    [[255, 192, 203], "Rosa"],
    [[255, 105, 180], "Rosa"],
    [[139, 69, 19], "Braun"],
    [[195, 176, 145], "Beige"],
    [[225, 205, 170], "Beige"],
    [[255, 140, 0], "Orange"],
    [[240, 200, 30], "Gelb"],
    [[40, 140, 60], "Grün"],
    [[110, 50, 160], "Lila"],
    [[128, 128, 128], "Grau"],
    [[40, 40, 42], "Schwarz"],
    [[248, 248, 250], "Weiß"],
  ])("maps %j to %s", (rgb, name) => {
    expect(colorName(...rgb)).toBe(name);
  });
});

describe("suggestColor", () => {
  const white: Rgb = [252, 252, 252];
  const black: Rgb = [5, 5, 5];

  it("ignores a white or black background around the garment", () => {
    expect(suggestColor(pixels([white, 70], [[30, 80, 200], 30]))).toBe("Blau");
    expect(suggestColor(pixels([black, 70], [[200, 30, 40], 30]))).toBe("Rot");
  });

  it("tolerates shading that splits the garment into two neighbouring colors", () => {
    expect(suggestColor(pixels([[30, 80, 200], 60], [[11, 31, 58], 40]))).toBe("Blau");
  });

  it("suggests Mehrfarbig for three or more prominent colors", () => {
    expect(
      suggestColor(pixels([[30, 80, 200], 40], [[200, 30, 40], 30], [[240, 200, 30], 30])),
    ).toBe("Mehrfarbig");
  });

  it("falls back to Weiß or Schwarz when the garment itself is white or black", () => {
    expect(suggestColor(pixels([white, 95], [[30, 80, 200], 5]))).toBe("Weiß");
    expect(suggestColor(pixels([black, 95], [white, 3]))).toBe("Schwarz");
  });

  it("returns null when there are no opaque pixels", () => {
    expect(suggestColor(new Uint8ClampedArray([10, 20, 30, 0]))).toBeNull();
    expect(suggestColor(new Uint8ClampedArray())).toBeNull();
  });
});

import type { ItemColor } from "@shared/item";

type Hsl = { hue: number; lightness: number; chroma: number };

// Hue in degrees, lightness and chroma from 0 to 1.
function toHsl(r: number, g: number, b: number): Hsl {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = (max - min) / 255;
  const lightness = (max + min) / 2 / 255;
  if (max === min) return { hue: 0, lightness, chroma };

  const delta = max - min;
  let hue: number;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  return { hue: (hue * 60 + 360) % 360, lightness, chroma };
}

// Closest name from the color list for one RGB value. Never "Mehrfarbig".
export function colorName(r: number, g: number, b: number): Exclude<ItemColor, "Mehrfarbig"> {
  const { hue, lightness, chroma } = toHsl(r, g, b);

  if (lightness < 0.12) return "Schwarz";
  if (chroma < 0.1) {
    if (lightness < 0.25) return "Schwarz";
    if (lightness > 0.85) return "Weiß";
    return "Grau";
  }
  if (lightness > 0.92) return "Weiß";

  const isRedHue = hue >= 345 || hue < 10;
  if (isRedHue) return lightness > 0.7 ? "Rosa" : "Rot";
  if (hue < 45) {
    if (lightness < 0.5) return "Braun";
    return chroma < 0.45 ? "Beige" : "Orange";
  }
  if (hue < 70) {
    if (lightness < 0.3) return "Grün";
    return chroma < 0.45 && lightness > 0.55 ? "Beige" : "Gelb";
  }
  if (hue < 165) return "Grün";
  if (hue < 255) return hue >= 195 && lightness < 0.3 ? "Navy" : "Blau";
  if (hue < 290) return "Lila";
  return lightness < 0.35 ? "Lila" : "Rosa";
}

// Background around a garment is usually a white wall or a dark floor.
const isNearWhite = (r: number, g: number, b: number) => Math.min(r, g, b) > 230;
const isNearBlack = (r: number, g: number, b: number) => Math.max(r, g, b) < 28;

// Share of counted pixels a color needs to count towards "Mehrfarbig".
const MULTICOLOR_SHARE = 0.15;
// Below this share of colored pixels, the garment itself is white or black.
const MIN_COLORED_SHARE = 0.1;

// Suggests a color from RGBA pixels (e.g. ImageData.data of the photo's center).
// Null when there is nothing to judge, e.g. a fully transparent image.
export function suggestColor(pixels: Uint8ClampedArray): ItemColor | null {
  const counts = new Map<ItemColor, number>();
  let total = 0;
  let white = 0;
  let black = 0;

  for (let index = 0; index + 3 < pixels.length; index += 4) {
    const r = pixels[index] ?? 0;
    const g = pixels[index + 1] ?? 0;
    const b = pixels[index + 2] ?? 0;
    const alpha = pixels[index + 3] ?? 0;
    if (alpha < 128) continue;

    total += 1;
    if (isNearWhite(r, g, b)) white += 1;
    else if (isNearBlack(r, g, b)) black += 1;
    else {
      const name = colorName(r, g, b);
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  if (total === 0) return null;
  const counted = total - white - black;
  if (counted < total * MIN_COLORED_SHARE) return black >= white ? "Schwarz" : "Weiß";

  const ranked = [...counts.entries()].sort((left, right) => right[1] - left[1]);
  const prominent = ranked.filter(([, count]) => count >= counted * MULTICOLOR_SHARE);
  // Shading splits one color into two neighbours at most; three prominent
  // colors mean a pattern.
  if (prominent.length >= 3) return "Mehrfarbig";
  return ranked[0]?.[0] ?? null;
}

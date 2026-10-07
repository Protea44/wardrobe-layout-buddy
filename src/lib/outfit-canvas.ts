import type { CSSProperties } from "react";

import type { OutfitItemInput, OutfitResponse } from "@shared/outfit";

// Width of an item at scale 1, relative to the canvas width.
export const BASE_ITEM_WIDTH = 0.34;
export const SCALE_MIN = 0.4;
export const SCALE_MAX = 2.5;
// Arrow keys move by this share of the canvas; with Shift five times as far.
export const KEY_STEP = 0.01;

// One item on the canvas. x and y are its center, relative to the canvas
// (0 to 1), so the outfit looks the same on every screen. The array order is
// the stacking order, back to front.
export type CanvasItem = {
  itemId: string;
  x: number;
  y: number;
  scale: number;
  name: string;
  thumbnailKey: string | null;
};

export type PickedItem = Pick<CanvasItem, "itemId" | "name" | "thumbnailKey">;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function fromOutfit(outfit: OutfitResponse): CanvasItem[] {
  return [...outfit.items]
    .sort((left, right) => left.zIndex - right.zIndex)
    .map(({ itemId, x, y, scale, name, thumbnailKey }) => ({
      itemId,
      x,
      y,
      scale: clamp(scale, SCALE_MIN, SCALE_MAX),
      name,
      thumbnailKey,
    }));
}

// Placements for the API; the stacking order becomes zIndex 0, 1, 2, ...
export function toPlacements(items: CanvasItem[]): OutfitItemInput[] {
  return items.map(({ itemId, x, y, scale }, zIndex) => ({ itemId, x, y, scale, zIndex }));
}

// New items land near the center, slightly apart so they do not hide each other.
export function addItem(items: CanvasItem[], picked: PickedItem): CanvasItem[] {
  if (items.some(({ itemId }) => itemId === picked.itemId)) return items;
  const offset = ((items.length % 5) - 2) * 0.06;
  return [...items, { ...picked, x: 0.5 + offset, y: 0.5 + offset, scale: 1 }];
}

export function removeItem(items: CanvasItem[], itemId: string) {
  return items.filter((item) => item.itemId !== itemId);
}

function update(items: CanvasItem[], itemId: string, change: (item: CanvasItem) => CanvasItem) {
  return items.map((item) => (item.itemId === itemId ? change(item) : item));
}

export function moveItemTo(items: CanvasItem[], itemId: string, x: number, y: number) {
  return update(items, itemId, (item) => ({ ...item, x: clamp(x, 0, 1), y: clamp(y, 0, 1) }));
}

export function moveItemBy(items: CanvasItem[], itemId: string, dx: number, dy: number) {
  return update(items, itemId, (item) => ({
    ...item,
    x: clamp(item.x + dx, 0, 1),
    y: clamp(item.y + dy, 0, 1),
  }));
}

export function resizeItem(items: CanvasItem[], itemId: string, scale: number) {
  return update(items, itemId, (item) => ({ ...item, scale: clamp(scale, SCALE_MIN, SCALE_MAX) }));
}

// Swaps the item with its neighbour in front (+1) or behind (-1).
export function restack(items: CanvasItem[], itemId: string, direction: 1 | -1) {
  const index = items.findIndex((item) => item.itemId === itemId);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target] as CanvasItem, next[index] as CanvasItem];
  return next;
}

// Position and size of an item on a canvas, in percent of the canvas.
export function placementStyle(
  item: Pick<CanvasItem, "x" | "y" | "scale">,
  stackIndex: number,
): CSSProperties {
  return {
    left: `${item.x * 100}%`,
    top: `${item.y * 100}%`,
    width: `${BASE_ITEM_WIDTH * item.scale * 100}%`,
    zIndex: stackIndex + 1,
  };
}

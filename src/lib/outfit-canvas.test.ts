import { describe, expect, it } from "vitest";

import {
  addItem,
  fromOutfit,
  moveItemBy,
  moveItemTo,
  removeItem,
  resizeItem,
  restack,
  SCALE_MAX,
  SCALE_MIN,
  toPlacements,
  type CanvasItem,
} from "@/lib/outfit-canvas";

const picked = (itemId: string) => ({ itemId, name: itemId, thumbnailKey: null });

function canvas(...ids: string[]) {
  return ids.reduce<CanvasItem[]>((items, id) => addItem(items, picked(id)), []);
}

const ids = (items: CanvasItem[]) => items.map(({ itemId }) => itemId);

describe("outfit canvas", () => {
  it("adds each item once, in front, near the center", () => {
    const items = addItem(canvas("hemd", "hose"), picked("hemd"));

    expect(ids(items)).toEqual(["hemd", "hose"]);
    for (const item of items) {
      expect(item.x).toBeGreaterThan(0.3);
      expect(item.x).toBeLessThan(0.7);
      expect(item.scale).toBe(1);
    }
    expect(items[0]?.x).not.toBe(items[1]?.x);
  });

  it("keeps positions and sizes inside their bounds", () => {
    let items = canvas("hemd");

    items = moveItemTo(items, "hemd", 1.4, -0.2);
    expect(items[0]).toMatchObject({ x: 1, y: 0 });
    items = moveItemBy(items, "hemd", -0.25, 0.1);
    expect(items[0]?.x).toBeCloseTo(0.75);
    expect(items[0]?.y).toBeCloseTo(0.1);
    expect(resizeItem(items, "hemd", 10)[0]?.scale).toBe(SCALE_MAX);
    expect(resizeItem(items, "hemd", 0)[0]?.scale).toBe(SCALE_MIN);
  });

  it("brings items forward and backward and removes them", () => {
    const items = canvas("a", "b", "c");

    expect(ids(restack(items, "a", 1))).toEqual(["b", "a", "c"]);
    expect(ids(restack(items, "c", -1))).toEqual(["a", "c", "b"]);
    expect(restack(items, "c", 1)).toBe(items);
    expect(restack(items, "a", -1)).toBe(items);
    expect(ids(removeItem(items, "b"))).toEqual(["a", "c"]);
  });

  it("turns the stacking order into zIndex and back", () => {
    const placements = toPlacements(restack(canvas("a", "b"), "a", 1));

    expect(placements.map(({ itemId, zIndex }) => ({ itemId, zIndex }))).toEqual([
      { itemId: "b", zIndex: 0 },
      { itemId: "a", zIndex: 1 },
    ]);

    const outfit = {
      id: "o",
      name: "Büro",
      occasion: null,
      createdAt: "2026-10-07T12:00:00.000Z",
      updatedAt: "2026-10-07T12:00:00.000Z",
      items: [
        { itemId: "top", x: 0.5, y: 0.2, scale: 1, zIndex: 7, name: "Top", thumbnailKey: null },
        { itemId: "back", x: 0.5, y: 0.6, scale: 9, zIndex: 2, name: "Back", thumbnailKey: "k" },
      ],
    };
    const loaded = fromOutfit(outfit);
    expect(ids(loaded)).toEqual(["back", "top"]);
    expect(loaded[0]?.scale).toBe(SCALE_MAX);
  });
});

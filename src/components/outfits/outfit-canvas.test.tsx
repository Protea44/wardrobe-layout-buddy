import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ItemPicker } from "@/components/outfits/item-picker";
import { OutfitCanvas } from "@/components/outfits/outfit-canvas";
import { addItem, type CanvasItem } from "@/lib/outfit-canvas";
import { itemFixture } from "@/test/fixtures";

let latest: CanvasItem[] = [];

function Harness({ initial }: { initial: CanvasItem[] }) {
  const [items, setItems] = useState(initial);
  const [selected, setSelected] = useState<string | null>(null);
  latest = items;
  return (
    <OutfitCanvas items={items} selectedId={selected} onSelect={setSelected} onChange={setItems} />
  );
}

const start = [
  { itemId: "hemd", name: "Hemd", thumbnailKey: null },
  { itemId: "hose", name: "Hose", thumbnailKey: null },
].reduce<CanvasItem[]>((items, item) => addItem(items, item), []);

describe("OutfitCanvas", () => {
  it("moves a focused item with the arrow keys, in bigger steps with Shift", () => {
    render(<Harness initial={start} />);
    const shirt = screen.getByRole("button", { name: "Hemd" });
    const { x, y } = latest[0] as CanvasItem;

    fireEvent.focus(shirt);
    fireEvent.keyDown(shirt, { key: "ArrowRight" });
    fireEvent.keyDown(shirt, { key: "ArrowDown", shiftKey: true });

    expect(latest[0]?.x).toBeCloseTo(x + 0.01);
    expect(latest[0]?.y).toBeCloseTo(y + 0.05);
    expect(shirt).toHaveAttribute("aria-pressed", "true");
  });

  it("resizes, restacks and removes the selected item", () => {
    render(<Harness initial={start} />);
    fireEvent.focus(screen.getByRole("button", { name: "Hemd" }));

    fireEvent.change(screen.getByLabelText("Größe"), { target: { value: "1.5" } });
    expect(latest[0]?.scale).toBe(1.5);

    fireEvent.click(screen.getByRole("button", { name: "Nach vorne" }));
    expect(latest.map(({ itemId }) => itemId)).toEqual(["hose", "hemd"]);
    fireEvent.click(screen.getByRole("button", { name: "Nach hinten" }));
    expect(latest.map(({ itemId }) => itemId)).toEqual(["hemd", "hose"]);

    fireEvent.click(screen.getByRole("button", { name: "Entfernen" }));
    expect(latest.map(({ itemId }) => itemId)).toEqual(["hose"]);
    expect(screen.queryByLabelText("Größe")).toBeNull();
  });

  it("removes a focused item with Delete", () => {
    render(<Harness initial={start} />);
    const trousers = screen.getByRole("button", { name: "Hose" });

    fireEvent.focus(trousers);
    fireEvent.keyDown(trousers, { key: "Delete" });

    expect(latest.map(({ itemId }) => itemId)).toEqual(["hemd"]);
  });

  it("explains how to arrange items, also without a mouse", () => {
    render(<Harness initial={[]} />);

    expect(screen.getByRole("group", { name: "Outfit-Fläche" })).toHaveAccessibleDescription(
      /Pfeiltasten/,
    );
    expect(screen.getByText(/Wähle Teile aus/)).toBeInTheDocument();
  });
});

describe("ItemPicker", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("adds an item on tap and marks the ones already in the outfit", async () => {
    const items = [itemFixture({ id: "a", name: "Hemd" }), itemFixture({ id: "b", name: "Hose" })];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        const body = url.startsWith("/api/items/facets")
          ? { categories: ["Oberteil"], colors: [], brands: [], seasons: [] }
          : { items, total: 2, nextCursor: null };
        return Promise.resolve(
          new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } }),
        );
      }),
    );
    const onPick = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ItemPicker pickedIds={new Set(["b"])} onPick={onPick} />
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Hemd" }));

    expect(onPick).toHaveBeenCalledWith({
      itemId: "a",
      name: "Hemd",
      thumbnailKey: "user-1/item-1/thumbnail.webp",
    });
    const trousers = screen.getByRole("button", { name: /^Hose/ });
    expect(trousers).toBeDisabled();
    expect(trousers).toHaveAccessibleName(/bereits im Outfit/);
  });
});

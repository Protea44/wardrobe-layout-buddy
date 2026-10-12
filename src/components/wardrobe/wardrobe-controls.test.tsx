import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WardrobeFilters } from "@/components/wardrobe/wardrobe-filters";
import { WardrobeToolbar } from "@/components/wardrobe/wardrobe-toolbar";

describe("WardrobeToolbar", () => {
  afterEach(() => vi.useRealTimers());

  it("searches once typing pauses", () => {
    vi.useFakeTimers();
    const onQueryChange = vi.fn();
    render(
      <WardrobeToolbar
        query=""
        sort="newest"
        total={12}
        onQueryChange={onQueryChange}
        onSortChange={vi.fn()}
      />,
    );

    const input = screen.getByLabelText("Schrank durchsuchen");
    fireEvent.change(input, { target: { value: "lei" } });
    act(() => vi.advanceTimersByTime(100));
    fireEvent.change(input, { target: { value: "leinen" } });
    act(() => vi.advanceTimersByTime(299));
    expect(onQueryChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));

    expect(onQueryChange).toHaveBeenCalledTimes(1);
    expect(onQueryChange).toHaveBeenCalledWith("leinen");
  });

  it("shows the counter and offers the four sort orders", () => {
    const onSortChange = vi.fn();
    render(
      <WardrobeToolbar
        query=""
        sort="newest"
        total={12}
        onQueryChange={vi.fn()}
        onSortChange={onSortChange}
      />,
    );

    expect(screen.getByText("12 Teile")).toBeInTheDocument();
    const select = screen.getByLabelText("Sortieren");
    expect(Array.from((select as HTMLSelectElement).options, (option) => option.text)).toEqual([
      "Neueste zuerst",
      "Kaufdatum",
      "Preis aufsteigend",
      "Preis absteigend",
    ]);
    fireEvent.change(select, { target: { value: "priceAsc" } });
    expect(onSortChange).toHaveBeenCalledWith("priceAsc");
  });
});

describe("WardrobeFilters", () => {
  const facets = {
    categories: ["Hose", "Oberteil"],
    colors: ["Blau"],
    brands: ["Marke"],
    seasons: ["sommer" as const],
  };

  it("offers the user's values in the dropdowns and applies a choice", () => {
    const onChange = vi.fn();
    render(<WardrobeFilters search={{ sort: "priceAsc" }} facets={facets} onChange={onChange} />);

    const category = screen.getByLabelText("Kategorie");
    expect(Array.from((category as HTMLSelectElement).options, (option) => option.text)).toEqual([
      "Alle Kategorien",
      "Hose",
      "Oberteil",
    ]);
    fireEvent.change(category, { target: { value: "Hose" } });

    expect(onChange).toHaveBeenCalledWith({ sort: "priceAsc", category: "Hose" });
    expect(screen.queryByRole("list", { name: "Aktive Filter" })).toBeNull();
  });

  it("shows active filters as removable chips with a reset", () => {
    const onChange = vi.fn();
    const search = { q: "hemd", category: "Hose", season: "sommer" as const };
    render(<WardrobeFilters search={search} facets={facets} onChange={onChange} />);

    expect(screen.getByRole("button", { name: /Filter\s*2 aktiv/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Saison: Sommer entfernen" }));
    expect(onChange).toHaveBeenLastCalledWith({ q: "hemd", category: "Hose" });
    fireEvent.click(screen.getByRole("button", { name: "Suche: hemd entfernen" }));
    expect(onChange).toHaveBeenLastCalledWith({ category: "Hose", season: "sommer" });
    fireEvent.click(screen.getByRole("button", { name: "Alle zurücksetzen" }));
    expect(onChange).toHaveBeenLastCalledWith({});
  });
});

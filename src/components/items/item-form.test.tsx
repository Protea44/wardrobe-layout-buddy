import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ItemForm } from "@/components/items/item-form";

describe("ItemForm", () => {
  it("asks for a photo and a category before saving", async () => {
    render(<ItemForm />);

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    expect(await screen.findByText("Bitte füge ein Foto hinzu.")).toBeInTheDocument();
    expect(await screen.findByText("Bitte wähle eine Kategorie.")).toBeInTheDocument();
  });

  it("offers every category and color as a single-choice chip", () => {
    render(<ItemForm />);

    const categories = screen.getByRole("group", { name: /Kategorie/ });
    const colors = screen.getByRole("group", { name: "Farbe" });

    expect(categories.querySelectorAll("input[type=radio]")).toHaveLength(10);
    expect(colors.querySelectorAll("input[type=radio]")).toHaveLength(14);
  });

  it("proposes a default name from color and category", () => {
    render(<ItemForm />);

    fireEvent.click(screen.getByRole("radio", { name: "Navy" }));
    fireEvent.click(screen.getByRole("radio", { name: "Jacke & Mantel" }));

    expect(screen.getByText("Leer lassen für „Navy Jacke & Mantel“.")).toBeInTheDocument();
  });
});

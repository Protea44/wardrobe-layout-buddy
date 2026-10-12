import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DeleteItemDialog } from "@/components/items/delete-item-dialog";
import { ItemEditForm } from "@/components/items/item-edit-form";
import { ItemStatus } from "@/components/items/item-status";
import { itemFixture } from "@/test/fixtures";

describe("ItemStatus", () => {
  it("says the item is private and that sharing comes later", () => {
    render(<ItemStatus />);

    expect(screen.getByText("Privat – nur du siehst dieses Teil.")).toBeInTheDocument();
    expect(screen.getByText("Freigaben folgen in einer späteren Version.")).toBeInTheDocument();
  });
});

describe("ItemEditForm", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("starts with the item's values, chips and photo", () => {
    render(<ItemEditForm item={itemFixture()} onSaved={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole("radio", { name: "Oberteil" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Weiß" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Sommer" })).toBeChecked();
    expect(screen.getByLabelText("Name")).toHaveValue("Leinenhemd");
    expect(screen.getByLabelText("Preis in €")).toHaveValue("49,90");
    expect(screen.getByAltText("Vorschau deines Fotos")).toHaveAttribute(
      "src",
      "/api/files/item-photos/user-1/item-1/photo.webp",
    );
    expect(screen.getByRole("button", { name: /Anderes Foto wählen|Neu aufnehmen/ })).toBeVisible();
  });

  it("saves the changes with PATCH and reports the updated item", async () => {
    const updated = itemFixture({ name: "Sommerhemd" });
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(JSON.stringify(updated), { headers: { "Content-Type": "application/json" } }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const onSaved = vi.fn();
    render(<ItemEditForm item={itemFixture()} onSaved={onSaved} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Sommerhemd" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(updated));
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/api/items/item-1");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(init?.body as string)).toMatchObject({ name: "Sommerhemd", brand: "Marke" });
  });
});

describe("DeleteItemDialog", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("deletes only after confirmation", async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(null, { status: 204 })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const onDeleted = vi.fn();
    render(<DeleteItemDialog itemId="item-1" itemName="Leinenhemd" onDeleted={onDeleted} />);

    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));
    expect(await screen.findByRole("alertdialog", { name: "Teil löschen?" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Endgültig löschen" }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/items/item-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("keeps the item when cancelled", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    render(<DeleteItemDialog itemId="item-1" itemName="Leinenhemd" onDeleted={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));
    fireEvent.click(await screen.findByRole("button", { name: "Abbrechen" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReceiptTab } from "@/components/receipts/receipt-tab";

const receipts = [
  {
    id: "r-1",
    fileKey: "user-1/r-1/beleg.pdf",
    source: "UPLOAD",
    merchant: "Modehaus Beispiel",
    purchaseDate: "2026-09-30",
    receivedAt: "2026-10-01T09:00:00.000Z",
    parseStatus: "MANUAL",
    createdAt: "2026-10-01T09:00:00.000Z",
    itemCount: 2,
  },
  {
    id: "r-2",
    fileKey: "user-1/r-2/email.html",
    source: "EMAIL",
    merchant: null,
    purchaseDate: null,
    receivedAt: "2026-10-05T12:00:00.000Z",
    parseStatus: "PENDING",
    createdAt: "2026-10-05T12:00:00.000Z",
    itemCount: 1,
  },
];

function mockApi() {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      const body = url.endsWith("/forwarding-alias")
        ? { forwardingAlias: "k7f3m9q2xpab" }
        : receipts;
      return Promise.resolve(
        new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } }),
      );
    }),
  );
}

function renderTab() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ReceiptTab />
    </QueryClientProvider>,
  );
}

describe("ReceiptTab", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows the forwarding address with a copy button and its status", async () => {
    mockApi();
    renderTab();

    expect(
      await screen.findByText("k7f3m9q2xpab@belege.kleiderschrank-kompakt.de"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adresse kopieren" })).toBeInTheDocument();
    expect(screen.getByText("In Vorbereitung")).toBeInTheDocument();
    expect(screen.getByText(/Bis dahin kannst du Belege hier hochladen\./)).toBeInTheDocument();
  });

  it("lists receipts with date, merchant, item count and a view link", async () => {
    mockApi();
    renderTab();

    const list = await screen.findByRole("list");
    const rows = within(list).getAllByRole("listitem");

    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Modehaus Beispiel");
    expect(rows[0]).toHaveTextContent("30.09.2026 · 2 Teile");
    expect(rows[1]).toHaveTextContent("Per E-Mail erhalten");
    expect(rows[1]).toHaveTextContent("05.10.2026 · 1 Teil");
    const link = within(rows[0] as HTMLElement).getByRole("link", { name: /^Ansehen/ });
    expect(link).toHaveAttribute("href", "/api/files/receipts/user-1/r-1/beleg.pdf");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("offers the receipt upload", () => {
    mockApi();
    renderTab();

    expect(screen.getByRole("heading", { name: "Beleg hochladen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Beleg auswählen" })).toBeInTheDocument();
  });
});

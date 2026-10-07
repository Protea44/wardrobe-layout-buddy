import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DeleteAccountSection } from "@/components/settings/delete-account-section";
import { ExportSection } from "@/components/settings/export-section";
import { PrivacySection } from "@/components/settings/privacy-section";
import { getConsentSnapshot } from "@/lib/consent";

const account = {
  name: "Test Person",
  email: "test@example.test",
  createdAt: "2026-10-07T12:00:00.000Z",
  hasPassword: true,
};

function respond(status: number, body?: unknown, headers: Record<string, string> = {}) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PrivacySection", () => {
  it("states that everything is private and only offers Privat for now", () => {
    render(<PrivacySection />);

    expect(
      screen.getByText(
        "Alle deine Teile, Fotos, Belege und Outfits sind privat. Niemand außer dir kann sie sehen.",
      ),
    ).toBeInTheDocument();
    const select = screen.getByLabelText("Sichtbarkeit neuer Teile");
    expect(select).toBeDisabled();
    expect(select).toHaveValue("PRIVATE");
    expect(select).toHaveAccessibleDescription("Weitere Optionen folgen.");
  });

  it("opens the cookie settings", () => {
    render(<PrivacySection />);

    fireEvent.click(screen.getByRole("button", { name: "Cookie-Einstellungen" }));

    expect(getConsentSnapshot().settingsOpen).toBe(true);
  });
});

describe("ExportSection", () => {
  it("shows a loading state and downloads the ZIP under the server's file name", async () => {
    let finish: (response: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>((resolve) => (finish = resolve))),
    );
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: () => "blob:export",
      revokeObjectURL: () => {},
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe("kleiderschrank-kompakt-export-2026-10-07.zip");
      expect(this.href).toBe("blob:export");
    });
    render(<ExportSection />);

    fireEvent.click(screen.getByRole("button", { name: "Alle Daten exportieren" }));
    expect(await screen.findByRole("button", { name: "Export wird erstellt …" })).toBeDisabled();

    finish(
      new Response(new Blob(["zip"]), {
        headers: {
          "Content-Disposition":
            'attachment; filename="kleiderschrank-kompakt-export-2026-10-07.zip"',
        },
      }),
    );

    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(await screen.findByRole("button", { name: "Alle Daten exportieren" })).toBeEnabled();
  });

  it("explains the rate limit in German", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(respond(429, { statusCode: 429, error: "Too Many Requests", message: "" })),
      ),
    );
    render(<ExportSection />);

    fireEvent.click(screen.getByRole("button", { name: "Alle Daten exportieren" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Zu viele Anfragen/);
  });
});

describe("DeleteAccountSection", () => {
  async function openDialog() {
    render(<DeleteAccountSection account={account} />);
    fireEvent.click(screen.getByRole("button", { name: "Konto löschen" }));
    return screen.findByRole("dialog", { name: "Konto endgültig löschen?" });
  }

  it("lists what is deleted and needs LÖSCHEN and the password", async () => {
    const dialog = await openDialog();
    const submit = screen.getByRole("button", { name: "Konto endgültig löschen" });

    expect(dialog).toHaveTextContent("alle Teile mit ihren Fotos");
    expect(dialog).toHaveTextContent("alle Belege und hochgeladenen Dateien");
    expect(dialog).toHaveTextContent("alle Outfits");
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Gib „LÖSCHEN“ ein/), { target: { value: "löschen" } });
    fireEvent.change(screen.getByLabelText("Dein Passwort"), { target: { value: "geheim" } });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Gib „LÖSCHEN“ ein/), { target: { value: "LÖSCHEN" } });
    expect(submit).toBeEnabled();
  });

  it("reports a wrong password in German and keeps the account", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          respond(403, { statusCode: 403, error: "Forbidden", message: "Wrong password" }),
        ),
      ),
    );
    await openDialog();

    fireEvent.change(screen.getByLabelText(/Gib „LÖSCHEN“ ein/), { target: { value: "LÖSCHEN" } });
    fireEvent.change(screen.getByLabelText("Dein Passwort"), { target: { value: "falsch" } });
    fireEvent.click(screen.getByRole("button", { name: "Konto endgültig löschen" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Das Passwort ist nicht richtig.");
  });

  it("sends the confirmation, clears local data and goes to the homepage", async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(null, { status: 204 })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const replace = vi.fn();
    vi.stubGlobal("location", { ...window.location, replace });
    window.localStorage.setItem("kk_consent", "{}");
    window.sessionStorage.setItem("draft", "x");
    await openDialog();

    fireEvent.change(screen.getByLabelText(/Gib „LÖSCHEN“ ein/), { target: { value: "LÖSCHEN" } });
    fireEvent.change(screen.getByLabelText("Dein Passwort"), { target: { value: "geheim" } });
    fireEvent.click(screen.getByRole("button", { name: "Konto endgültig löschen" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/?konto-geloescht=1"));
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/api/account");
    expect(init?.method).toBe("DELETE");
    expect(JSON.parse(init?.body as string)).toEqual({ confirm: "LÖSCHEN", password: "geheim" });
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});

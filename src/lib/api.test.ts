import { afterEach, describe, expect, it, vi } from "vitest";

import { healthResponseSchema } from "@shared/health";

import { api, ApiError } from "@/lib/api";

function mockFetch(response: Response | Error) {
  const fetchMock = vi.fn<typeof fetch>(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends credentials and returns the validated JSON body", async () => {
    const fetchMock = mockFetch(json({ ok: true }));

    const result = await api("/health", { schema: healthResponseSchema });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );
  });

  it("sends a JSON body with the matching content type", async () => {
    const fetchMock = mockFetch(json({ id: 1 }));

    await api("/items", { method: "POST", body: { name: "Mantel" } });

    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.body).toBe('{"name":"Mantel"}');
    expect(init?.headers).toMatchObject({ "Content-Type": "application/json" });
  });

  it("reports a network failure in German", async () => {
    mockFetch(new TypeError("Failed to fetch"));

    const error = await api("/health").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: null,
      message:
        "Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung und versuche es erneut.",
    });
  });

  it("maps HTTP errors to a German message and keeps status and code", async () => {
    mockFetch(json({ statusCode: 404, error: "Not Found", message: "Not found" }, 404));

    const error = await api("/items/1").catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      status: 404,
      code: "Not Found",
      message: "Der Eintrag wurde nicht gefunden.",
    });
  });

  it("handles error responses that are not JSON", async () => {
    mockFetch(new Response("<html>Bad Gateway</html>", { status: 502 }));

    const error = await api("/health").catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      status: 502,
      message: "Etwas ist schiefgelaufen. Bitte versuche es später erneut.",
    });
  });

  it("rejects a successful response that does not match the schema", async () => {
    mockFetch(json({ ok: "yes" }));

    const error = await api("/health", { schema: healthResponseSchema }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 200 });
  });

  it("returns undefined for an empty 204 response", async () => {
    mockFetch(new Response(null, { status: 204 }));

    expect(await api("/items/1", { method: "DELETE" })).toBeUndefined();
  });
});

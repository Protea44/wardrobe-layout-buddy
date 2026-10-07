import type { ZodType } from "zod";

import { apiErrorSchema } from "@shared/api-error";

const API_BASE = "/api";

const NETWORK_ERROR_MESSAGE =
  "Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung und versuche es erneut.";
const UNEXPECTED_RESPONSE_MESSAGE =
  "Der Server hat unerwartet geantwortet. Bitte versuche es später erneut.";

const STATUS_MESSAGES: Record<number, string> = {
  400: "Die Anfrage war ungültig. Bitte prüfe deine Eingaben.",
  401: "Bitte melde dich an.",
  403: "Dafür fehlt dir die Berechtigung.",
  404: "Der Eintrag wurde nicht gefunden.",
  413: "Die Datei ist zu groß.",
  429: "Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.",
};
const SERVER_ERROR_MESSAGE = "Etwas ist schiefgelaufen. Bitte versuche es später erneut.";

// `message` is German and safe to show to the user.
export class ApiError extends Error {
  // HTTP status, or null when no response arrived.
  readonly status: number | null;
  // Machine-readable error name from the API, e.g. "Not Found".
  readonly code: string | null;

  constructor(message: string, status: number | null, code: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type ApiOptions<T> = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  // Sent as JSON.
  body?: unknown;
  // Validates the response body; without it the body is returned unchecked.
  schema?: ZodType<T>;
  signal?: AbortSignal;
};

export async function api<T = unknown>(path: string, options: ApiOptions<T> = {}): Promise<T> {
  const { method = "GET", body, schema, signal } = options;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body !== undefined && { "Content-Type": "application/json" }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
      ...(signal !== undefined && { signal }),
    });
  } catch (error) {
    // Let callers tell a deliberate abort from a failed request.
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(NETWORK_ERROR_MESSAGE, null);
  }

  const data = await readJson(response);

  if (!response.ok) {
    const apiError = apiErrorSchema.safeParse(data);
    throw new ApiError(
      STATUS_MESSAGES[response.status] ?? SERVER_ERROR_MESSAGE,
      response.status,
      apiError.success ? apiError.data.error : null,
    );
  }

  if (!schema) return data as T;
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new ApiError(UNEXPECTED_RESPONSE_MESSAGE, response.status);
  return parsed.data;
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (text === "") return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    if (response.ok) throw new ApiError(UNEXPECTED_RESPONSE_MESSAGE, response.status);
    return undefined;
  }
}

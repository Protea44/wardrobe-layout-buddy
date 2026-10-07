import { accountResponseSchema, type AccountDeleteInput } from "@shared/account";

import { api, API_BASE, ApiError, errorForStatus, NETWORK_ERROR_MESSAGE } from "@/lib/api";

export const accountQueryKey = ["account"] as const;

export function fetchAccount() {
  return api("/account", { schema: accountResponseSchema });
}

export async function deleteAccount(input: AccountDeleteInput) {
  await api("/account", { method: "DELETE", body: input });
}

function filenameFrom(header: string | null) {
  return header?.match(/filename="([^"]+)"/)?.[1] ?? "kleiderschrank-kompakt-export.zip";
}

// Fetches the ZIP built by the server and hands it to the browser as a download.
export async function downloadExport() {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/account/export`, { credentials: "include" });
  } catch {
    throw new ApiError(NETWORK_ERROR_MESSAGE, null);
  }
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => undefined);
    throw errorForStatus(response.status, data);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filenameFrom(response.headers.get("Content-Disposition"));
    document.body.append(link);
    link.click();
    link.remove();
  } finally {
    // Give the browser a moment to start the download before freeing the file.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

// Removes everything this site stored in the browser.
export function clearLocalData() {
  for (const storage of ["localStorage", "sessionStorage"] as const) {
    try {
      window[storage].clear();
    } catch {
      // Storage may be blocked; then there is nothing to clear either.
    }
  }
}

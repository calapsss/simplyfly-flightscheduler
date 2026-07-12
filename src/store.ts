import type { AppState } from "./types";

const API_BASE = "/api";

async function requestState(path: string, init?: RequestInit): Promise<AppState> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      // Keep the HTTP status text when the response is not JSON.
    }
    throw new Error(detail || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<AppState>;
}

export async function loadState(): Promise<AppState> {
  return requestState("/state");
}

export async function saveState(state: AppState): Promise<AppState> {
  return requestState("/state", {
    method: "PUT",
    body: JSON.stringify(state),
  });
}

export async function resetState(): Promise<AppState> {
  return requestState("/reset", { method: "POST" });
}

export function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

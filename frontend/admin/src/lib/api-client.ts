type ApiEnvelope<T> =
  | { success: true; data: T; message?: string }
  | { success: false; error: { code: string; message: string; details?: unknown[] } };

export class ApiError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message);
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export async function apiFetch<T>(path: string, init: RequestInit & { token?: string | null } = {}): Promise<T> {
  const { token, headers, ...requestInit } = init;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestInit,
    headers: {
      Accept: "application/json",
      ...(requestInit.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    cache: requestInit.cache ?? "no-store",
  });

  if (response.status === 204) return undefined as T;

  let envelope: unknown;
  try {
    envelope = await response.json();
  } catch {
    if (!response.ok) {
      throw new ApiError(response.statusText || `HTTP Error ${response.status}`, response.status);
    }
    throw new ApiError("Response from server is not valid JSON", response.status);
  }

  if (!response.ok || (envelope && (envelope as Record<string, unknown>).success === false)) {
    let message = response.statusText || `HTTP Error ${response.status}`;
    let code: string | undefined;

    const envObj = envelope as Record<string, unknown>;

    if (envObj && typeof envObj === "object") {
      const error = envObj.error;
      if (error && typeof error === "object") {
        const errObj = error as Record<string, unknown>;
        if (typeof errObj.message === "string") message = errObj.message;
        if (typeof errObj.code === "string") code = errObj.code;
      } else if (typeof error === "string") {
        message = error;
      }
      if (typeof envObj.detail === "string") {
        message = envObj.detail;
      }
      if (typeof envObj.message === "string") {
        message = envObj.message;
      }
    }
    throw new ApiError(message, response.status, code);
  }

  const envObj = envelope as Record<string, unknown>;
  if (envObj && typeof envObj === "object" && "success" in envObj && "data" in envObj) {
    return envObj.data as T;
  }
  return envObj as T;
}

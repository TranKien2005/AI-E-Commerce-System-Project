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

  const envelope = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !envelope.success) {
    const message = envelope.success ? response.statusText : envelope.error.message;
    const code = envelope.success ? undefined : envelope.error.code;
    throw new ApiError(message, response.status, code);
  }
  return envelope.data;
}

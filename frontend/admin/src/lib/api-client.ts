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

  let envelope: any;
  try {
    envelope = await response.json();
  } catch (err) {
    if (!response.ok) {
      throw new ApiError(response.statusText || `HTTP Error ${response.status}`, response.status);
    }
    throw new ApiError("Phản hồi từ máy chủ không đúng định dạng JSON", response.status);
  }

  if (!response.ok || (envelope && envelope.success === false)) {
    let message = response.statusText || `HTTP Error ${response.status}`;
    let code: string | undefined = undefined;

    if (envelope && typeof envelope === "object") {
      if (envelope.error && typeof envelope.error === "object") {
        message = envelope.error.message || message;
        code = envelope.error.code;
      } else if (typeof envelope.detail === "string") {
        message = envelope.detail;
      } else if (typeof envelope.detail === "object" && envelope.detail !== null) {
        message = JSON.stringify(envelope.detail);
      } else if (typeof envelope.message === "string") {
        message = envelope.message;
      } else if (typeof envelope.error === "string") {
        message = envelope.error;
      }
    }
    throw new ApiError(message, response.status, code);
  }

  if (envelope && typeof envelope === "object" && "success" in envelope && "data" in envelope) {
    return envelope.data as T;
  }
  return envelope as T;
}

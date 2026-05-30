type ApiEnvelope<T> =
  | { success: true; data: T; message?: string }
  | { success: false; error: { code: string; message: string; details?: unknown[] } };

export class ApiError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message);
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

export async function apiFetch<T>(path: string, init: RequestInit & { token?: string | null } = {}): Promise<T> {
  const { token, headers, ...requestInit } = init;
  const typedHeaders = headers as Record<string, string> | undefined;
  
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestInit,
    headers: {
      Accept: "application/json",
      ...(requestInit.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...typedHeaders,
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
    throw new ApiError("Phản hồi từ máy chủ không đúng định dạng JSON", response.status);
  }

  const body = isRecord(envelope) ? envelope : null;
  if (!response.ok || body?.success === false) {
    let message = response.statusText || `HTTP Error ${response.status}`;
    let code: string | undefined = undefined;

    if (body) {
      if (isRecord(body.error)) {
        message = typeof body.error.message === "string" ? body.error.message : message;
        code = typeof body.error.code === "string" ? body.error.code : undefined;
      } else if (typeof body.detail === "string") {
        message = body.detail;
      } else if (isRecord(body.detail)) {
        message = JSON.stringify(body.detail);
      } else if (typeof body.message === "string") {
        message = body.message;
      } else if (typeof body.error === "string") {
        message = body.error;
      }
    }
    throw new ApiError(message, response.status, code);
  }

  if (body && "success" in body && "data" in body) {
    return body.data as T;
  }
  return envelope as T;
}

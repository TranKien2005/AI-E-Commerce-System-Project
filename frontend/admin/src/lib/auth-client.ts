import { useEffect, useState } from "react";
import { apiFetch } from "./api-client";
import type { AuthTokens } from "./api-types";

const ACCESS_TOKEN_KEY = "admin_access_token";
const REFRESH_TOKEN_KEY = "admin_refresh_token";
export const ADMIN_AUTH_CHANGED_EVENT = "admin-auth-changed";

const dispatchAuthChanged = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(ADMIN_AUTH_CHANGED_EVENT));
};

export const getAccessToken = () => (typeof window === "undefined" ? null : localStorage.getItem(ACCESS_TOKEN_KEY));

export const setTokens = (tokens: AuthTokens) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  dispatchAuthChanged();
};

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  dispatchAuthChanged();
};

export const useAdminToken = () => {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const syncToken = () => {
      setToken(getAccessToken());
      setHydrated(true);
    };
    syncToken();
    window.addEventListener(ADMIN_AUTH_CHANGED_EVENT, syncToken);
    window.addEventListener("storage", syncToken);
    return () => {
      window.removeEventListener(ADMIN_AUTH_CHANGED_EVENT, syncToken);
      window.removeEventListener("storage", syncToken);
    };
  }, []);

  return { token, hydrated };
};

export const login = (email: string, password: string) =>
  apiFetch<AuthTokens>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

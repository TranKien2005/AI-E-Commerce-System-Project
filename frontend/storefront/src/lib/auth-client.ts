import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { apiFetch } from "./api-client";
import type { AuthTokens, CurrentUser } from "./api-types";

const ACCESS_TOKEN_KEY = "storefront_access_token";
const REFRESH_TOKEN_KEY = "storefront_refresh_token";
export const AUTH_CHANGED_EVENT = "storefront-auth-changed";

const dispatchAuthChanged = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
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

export const useAccessToken = () => {
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const syncToken = () => {
      setToken(getAccessToken());
      setHydrated(true);
    };
    syncToken();
    window.addEventListener(AUTH_CHANGED_EVENT, syncToken);
    window.addEventListener("storage", syncToken);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncToken);
      window.removeEventListener("storage", syncToken);
    };
  }, [pathname]);

  return { token, hydrated };
};

export const clearTokensIfUnauthorized = (error: unknown) => {
  const status = error instanceof Error && "status" in error ? error.status : undefined;
  if (status === 401) {
    clearTokens();
    return true;
  }
  return false;
};

export const login = (email: string, password: string) =>
  apiFetch<AuthTokens>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

export const register = (email: string, password: string, full_name: string) =>
  apiFetch<{ id: number; email: string }>("/auth/register", { method: "POST", body: JSON.stringify({ email, password, full_name }) });

export const verifyOtp = (email: string, otp: string) =>
  apiFetch<{ verified: boolean }>("/auth/verify-otp", { method: "POST", body: JSON.stringify({ email, otp }) });

export const resendVerificationOtp = (email: string) =>
  apiFetch<{ sent: boolean; email: string }>("/auth/resend-verification-otp", { method: "POST", body: JSON.stringify({ email }) });

export const getCurrentUser = () => apiFetch<CurrentUser>("/users/me", { token: getAccessToken() });

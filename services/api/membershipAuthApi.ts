import { BACKEND_API_PATHS, fetchBackendApi } from "@/utils/api";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  status: string;
  emailVerifiedAt: string | null;
  mustChangePassword: boolean;
};

export type AuthTokenResult = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  refreshExpiresAt: string;
  sessionId: string;
  user: AuthUser;
};

type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  } | null;
  meta: Record<string, unknown>;
};

const ACCESS_TOKEN_KEY = "membership.accessToken";
const REFRESH_TOKEN_KEY = "membership.refreshToken";
const AUTH_USER_KEY = "membership.user";

async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error?.message || "認證 API 呼叫失敗");
  }
  return body.data;
}

function authPath(path = "") {
  return `${BACKEND_API_PATHS.membershipAuth}${path}`;
}

export function getMembershipAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getMembershipRefreshToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getMembershipAuthHeaders(): HeadersInit {
  const token = getMembershipAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getStoredAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function storeAuthTokens(result: AuthTokenResult) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, result.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.user));
}

export function clearAuthTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
}

export async function loginMembership(payload: {
  login: string;
  password: string;
  rememberMe: boolean;
}) {
  const response = await fetchBackendApi(authPath("/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await parseApiResponse<AuthTokenResult>(response);
  storeAuthTokens(result);
  return result;
}

export async function refreshMembershipToken() {
  const refreshToken = getMembershipRefreshToken();
  if (!refreshToken) throw new Error("Refresh token 不存在");
  const response = await fetchBackendApi(authPath("/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const result = await parseApiResponse<AuthTokenResult>(response);
  storeAuthTokens(result);
  return result;
}

export async function logoutMembership() {
  const refreshToken = getMembershipRefreshToken();
  const response = await fetchBackendApi(authPath("/logout"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getMembershipAuthHeaders(),
    },
    body: JSON.stringify({ refreshToken }),
  });
  clearAuthTokens();
  if (!response.ok) return { loggedOut: true, revoked: false };
  return parseApiResponse<{ loggedOut: boolean; revoked: boolean }>(response);
}

export async function fetchCurrentMembershipUser() {
  const response = await fetchBackendApi(authPath("/me"), {
    headers: getMembershipAuthHeaders(),
    cache: "no-store",
  });
  const user = await parseApiResponse<AuthUser>(response);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }
  return user;
}

export async function forgotMembershipPassword(email: string) {
  const response = await fetchBackendApi(authPath("/forgot-password"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return parseApiResponse<{ accepted: boolean; resetToken: string | null }>(response);
}

export async function resetMembershipPassword(payload: {
  token: string;
  newPassword: string;
}) {
  const response = await fetchBackendApi(authPath("/reset-password"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseApiResponse<{ reset: boolean }>(response);
}

export async function requestMembershipEmailVerification() {
  const response = await fetchBackendApi(authPath("/email-verification/request"), {
    method: "POST",
    headers: getMembershipAuthHeaders(),
  });
  return parseApiResponse<{ accepted: boolean; verificationToken: string | null }>(response);
}

export async function verifyMembershipEmail(token: string) {
  const response = await fetchBackendApi(authPath("/email-verification/verify"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return parseApiResponse<{ verified: boolean }>(response);
}

import { expect, type APIRequestContext, type APIResponse, type Page } from "@playwright/test";

import { backendURL } from "./audit-log";

export type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: { code?: string; message?: string; details?: Record<string, unknown> } | null;
};

export type AuthenticatedSession = {
  accessToken: string;
  userId: string;
};

export function authHeaders(accessToken: string, json = false): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

export async function loginAsAdmin(page: Page): Promise<AuthenticatedSession> {
  await page.goto("/");

  const session = await page.evaluate(() => ({
    accessToken: window.localStorage.getItem("membership.accessToken") ?? "",
    userId: JSON.parse(window.localStorage.getItem("membership.user") ?? "null")?.id ?? "",
    username: JSON.parse(window.localStorage.getItem("membership.user") ?? "null")?.username ?? "",
  }));
  expect(session.accessToken, "setup 應保存測試帳號的 access token").not.toBe("");
  expect(session.userId, "setup 應保存測試帳號 ID").not.toBe("");
  expect(session.username, "後續測試必須使用 Playwright 專用帳號").toBe(
    process.env.E2E_TEST_LOGIN ?? "playwrighttestuser",
  );
  return session;
}

export async function expectEnvelope<T>(response: APIResponse): Promise<T> {
  const body = (await response.json()) as ApiEnvelope<T>;
  expect(response.ok(), body.error?.message ?? `API ${response.status()} ${response.url()}`).toBe(true);
  expect(body.success, body.error?.message ?? "API success 應為 true").toBe(true);
  expect(body.data, "API 應回傳 data").not.toBeNull();
  return body.data as T;
}

export async function deleteIfPresent(
  request: APIRequestContext,
  path: string,
  accessToken: string,
): Promise<void> {
  const response = await request.delete(`${backendURL}${path}`, {
    headers: authHeaders(accessToken),
  });
  expect([200, 204, 404]).toContain(response.status());
}

export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

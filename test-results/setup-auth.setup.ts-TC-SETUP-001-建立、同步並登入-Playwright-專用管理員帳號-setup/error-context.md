# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: setup/auth.setup.ts >> TC-SETUP-001 建立、同步並登入 Playwright 專用管理員帳號
- Location: tests/e2e/setup/auth.setup.ts:44:5

# Error details

```
Error: User identity already exists.

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  1  | import { expect, type APIRequestContext, type APIResponse, type Page } from "@playwright/test";
  2  | 
  3  | import { backendURL } from "./audit-log";
  4  | 
  5  | export type ApiEnvelope<T> = {
  6  |   success: boolean;
  7  |   data: T | null;
  8  |   error: { code?: string; message?: string; details?: Record<string, unknown> } | null;
  9  | };
  10 | 
  11 | export type AuthenticatedSession = {
  12 |   accessToken: string;
  13 |   userId: string;
  14 | };
  15 | 
  16 | export function authHeaders(accessToken: string, json = false): Record<string, string> {
  17 |   return {
  18 |     Authorization: `Bearer ${accessToken}`,
  19 |     ...(json ? { "Content-Type": "application/json" } : {}),
  20 |   };
  21 | }
  22 | 
  23 | export async function loginAsAdmin(page: Page): Promise<AuthenticatedSession> {
  24 |   await page.goto("/");
  25 | 
  26 |   const session = await page.evaluate(() => ({
  27 |     accessToken: window.localStorage.getItem("membership.accessToken") ?? "",
  28 |     userId: JSON.parse(window.localStorage.getItem("membership.user") ?? "null")?.id ?? "",
  29 |     username: JSON.parse(window.localStorage.getItem("membership.user") ?? "null")?.username ?? "",
  30 |   }));
  31 |   expect(session.accessToken, "setup 應保存測試帳號的 access token").not.toBe("");
  32 |   expect(session.userId, "setup 應保存測試帳號 ID").not.toBe("");
  33 |   expect(session.username, "後續測試必須使用 Playwright 專用帳號").toBe(
  34 |     process.env.E2E_TEST_LOGIN ?? "playwrighttestuser",
  35 |   );
  36 |   return session;
  37 | }
  38 | 
  39 | export async function expectEnvelope<T>(response: APIResponse): Promise<T> {
  40 |   const body = (await response.json()) as ApiEnvelope<T>;
> 41 |   expect(response.ok(), body.error?.message ?? `API ${response.status()} ${response.url()}`).toBe(true);
     |                                                                                              ^ Error: User identity already exists.
  42 |   expect(body.success, body.error?.message ?? "API success 應為 true").toBe(true);
  43 |   expect(body.data, "API 應回傳 data").not.toBeNull();
  44 |   return body.data as T;
  45 | }
  46 | 
  47 | export async function deleteIfPresent(
  48 |   request: APIRequestContext,
  49 |   path: string,
  50 |   accessToken: string,
  51 | ): Promise<void> {
  52 |   const response = await request.delete(`${backendURL}${path}`, {
  53 |     headers: authHeaders(accessToken),
  54 |   });
  55 |   expect([200, 204, 404]).toContain(response.status());
  56 | }
  57 | 
  58 | export function uniqueSuffix(): string {
  59 |   return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  60 | }
  61 | 
```
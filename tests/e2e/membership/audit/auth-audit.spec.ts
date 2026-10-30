import {
  APIRequestContext,
  expect,
  request as playwrightRequest,
  Response,
  test,
} from "@playwright/test";

import {
  expectAuditLog,
  loginAsAuditAdmin,
} from "../../support/audit-log";

function isPostResponse(response: Response, path: string): boolean {
  return new URL(response.url()).pathname === path && response.request().method() === "POST";
}

test.describe("登入與帳號操作會產生 Audit Log", () => {
  test.describe.configure({ mode: "serial" });

  let api: APIRequestContext;
  let auditAdminToken: string;

  test.beforeAll(async () => {
    // 共用準備：建立 API context 並取得可查詢 Audit Log 的管理員 token。
    api = await playwrightRequest.newContext();
    auditAdminToken = await loginAsAuditAdmin(api);
  });

  test.afterAll(async () => {
    // 共用清理：釋放整組案例共用的 API context。
    await api.dispose();
  });

  test("TC-AUDIT-AUTH-001 WEB 登入成功後產生 auth.login.success", async ({ page }) => {
    // 階段一：填入有效測試帳密，並記錄操作開始時間供 Audit Log 篩選。
    const startedAt = Date.now();
    await page.goto("/login");
    await page.locator("#login-account-input").fill(process.env.E2E_TEST_LOGIN ?? "playwrighttestuser");
    await page.locator("#login-password-input").fill(process.env.E2E_TEST_PASSWORD ?? "PlaywrightTest123!");

    // 階段二：送出登入並驗證 login API 成功回傳 token 與使用者 ID。
    const loginResponsePromise = page.waitForResponse(
      (response) => isPostResponse(response, "/api/membership/auth/login"),
    );
    await page.locator("#login-submit-button").click();
    const loginResponse = await loginResponsePromise;
    expect(loginResponse.ok()).toBe(true);

    const body = (await loginResponse.json()) as {
      data?: { accessToken?: string; user?: { id?: string } };
    };
    expect(body.data?.accessToken).toBeTruthy();
    expect(body.data?.user?.id).toBeTruthy();
    // 階段三：驗證後端已寫入對應使用者的 auth.login.success 成功紀錄。
    await expectAuditLog(api, body.data!.accessToken!, {
      action: "auth.login.success",
      startedAt,
      resourceId: body.data!.user!.id!,
      outcome: "SUCCESS",
    });
  });

  test("TC-AUDIT-AUTH-002 WEB 登入失敗後產生 auth.login.failed", async ({ page }) => {
    // 階段一：使用不存在的帳號送出登入，建立可辨識的失敗情境。
    const startedAt = Date.now();
    const missingLogin = `e2e-missing-${startedAt}`;
    await page.goto("/login");
    await page.locator("#login-account-input").fill(missingLogin);
    await page.locator("#login-password-input").fill("WrongPassword!");

    // 階段二：驗證 login API 回傳失敗。
    const loginResponsePromise = page.waitForResponse(
      (response) => isPostResponse(response, "/api/membership/auth/login"),
    );
    await page.locator("#login-submit-button").click();
    const loginResponse = await loginResponsePromise;
    expect(loginResponse.ok()).toBe(false);

    // 階段三：驗證 Audit Log 記錄帳號不存在及 FAILURE 結果。
    await expectAuditLog(api, auditAdminToken, {
      action: "auth.login.failed",
      startedAt,
      resourceId: missingLogin,
      outcome: "FAILURE",
      metadata: { reason: "ACCOUNT_NOT_FOUND" },
    });
  });

  test("TC-AUDIT-AUTH-003 WEB 忘記密碼後產生 auth.password.forgot", async ({ page }) => {
    // 階段一：以不存在的 Email 送出忘記密碼請求，驗證介面不洩漏帳號是否存在。
    const startedAt = Date.now();
    const missingEmail = `e2e-missing-${startedAt}@example.local`;
    await page.goto("/forgot-password");
    await page.locator("#forgot-password-email-input").fill(missingEmail);

    // 階段二：驗證 forgot-password API 仍正常回覆成功。
    const responsePromise = page.waitForResponse(
      (response) => isPostResponse(response, "/api/membership/auth/forgot-password"),
    );
    await page.locator("#forgot-password-submit-button").click();
    expect((await responsePromise).ok()).toBe(true);

    // 階段三：驗證 Audit Log 記錄 accountFound=false 的成功事件。
    await expectAuditLog(api, auditAdminToken, {
      action: "auth.password.forgot",
      startedAt,
      resourceId: missingEmail,
      outcome: "SUCCESS",
      metadata: { accountFound: false },
    });
  });

  test("TC-AUDIT-AUTH-004 WEB 使用無效 token 重設密碼後產生失敗 Log", async ({ page }) => {
    // 階段一：填入無效重設 token 與格式有效的新密碼。
    const startedAt = Date.now();
    await page.goto("/reset-password/confirm");
    await page.locator("#reset-password-token-input").fill(`invalid-reset-token-${startedAt}`);
    await page.locator("#reset-password-new-password-input").fill("E2eInvalid123!");
    await page.locator("#reset-password-confirm-password-input").fill("E2eInvalid123!");

    // 階段二：驗證 reset-password API 拒絕無效 token。
    const responsePromise = page.waitForResponse(
      (response) => isPostResponse(response, "/api/membership/auth/reset-password"),
    );
    await page.locator("#reset-password-confirm-submit-button").click();
    expect((await responsePromise).ok()).toBe(false);

    // 階段三：驗證 Audit Log 記錄 INVALID_TOKEN 的重設失敗事件。
    await expectAuditLog(api, auditAdminToken, {
      action: "auth.password.reset",
      startedAt,
      outcome: "FAILURE",
      metadata: { reason: "INVALID_TOKEN" },
    });
  });

  test("TC-AUDIT-AUTH-005 WEB 使用無效 token 驗證 Email 後產生失敗 Log", async ({ page }) => {
    // 階段一：在 Email 驗證頁輸入唯一的無效 token。
    const startedAt = Date.now();
    await page.goto("/verify-email");
    await page.locator("#email-verification-token-input").fill(`invalid-verify-token-${startedAt}`);

    // 階段二：驗證 Email verify API 拒絕無效 token。
    const responsePromise = page.waitForResponse(
      (response) => isPostResponse(response, "/api/membership/auth/email-verification/verify"),
    );
    await page.locator("#email-verification-submit-button").click();
    expect((await responsePromise).ok()).toBe(false);

    // 階段三：驗證 Audit Log 記錄 VERIFY 階段與 INVALID_TOKEN 原因。
    await expectAuditLog(api, auditAdminToken, {
      action: "auth.email_verification.verify",
      startedAt,
      outcome: "FAILURE",
      metadata: { phase: "VERIFY", reason: "INVALID_TOKEN" },
    });
  });
});

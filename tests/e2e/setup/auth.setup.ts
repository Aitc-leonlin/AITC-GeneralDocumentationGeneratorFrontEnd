import { expect, test, type APIRequestContext } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { backendURL } from "../support/audit-log";
import { authHeaders, expectEnvelope } from "../support/db-regression";

type LoginResult = {
  accessToken: string;
  user: { id: string };
};

type MembershipUser = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  employeeNo: string;
  organizationId: string | null;
  departmentId: string | null;
  positionId: string | null;
  status: "ACTIVE" | "INACTIVE";
  locale: string;
  timezone: string;
};

const bootstrapAdminLogin = process.env.E2E_BOOTSTRAP_ADMIN_LOGIN ?? "system.admin";
const bootstrapAdminPassword = process.env.E2E_BOOTSTRAP_ADMIN_PASSWORD ?? "Admin123!";
const testLogin = process.env.E2E_TEST_LOGIN ?? "playwrighttestuser";
const testPassword = process.env.E2E_TEST_PASSWORD ?? "PlaywrightTest123!";
const testUserStorageState = "playwright/.auth/playwrighttestuser.json";

async function login(
  request: APIRequestContext,
  loginName: string,
  password: string,
): Promise<LoginResult> {
  const response = await request.post(`${backendURL}/api/membership/auth/login`, {
    data: { login: loginName, password, rememberMe: false },
  });
  return expectEnvelope<LoginResult>(response);
}

test("TC-SETUP-001 建立、同步並登入 Playwright 專用管理員帳號", async ({
  page,
  request,
}) => {
  // 階段一：安全檢查測試帳號不得使用正式 system.admin，避免案例污染正式管理員狀態。
  expect(
    testLogin.toLowerCase(),
    "E2E_TEST_LOGIN 不可使用 system.admin，避免測試改動正式管理員狀態",
  ).not.toBe("system.admin");

  // 階段二：以 bootstrap 管理員登入並讀取其角色，作為測試帳號的權限基準。
  const bootstrapSession = await login(request, bootstrapAdminLogin, bootstrapAdminPassword);
  const adminRoleResult = await expectEnvelope<{ userId: string; roleIds: string[] }>(
    await request.get(
      `${backendURL}/api/membership/rbac/users/${bootstrapSession.user.id}/roles`,
      { headers: authHeaders(bootstrapSession.accessToken) },
    ),
  );
  expect(adminRoleResult.roleIds.length, "system admin 至少需要一個角色").toBeGreaterThan(0);

  // 階段三：查詢 Playwright 專用帳號，判斷需要新建或同步既有資料。
  const usersResult = await expectEnvelope<{ users: MembershipUser[] }>(
    await request.get(
      `${backendURL}/api/membership/users?page=1&pageSize=20&keyword=${encodeURIComponent(testLogin)}`,
      { headers: authHeaders(bootstrapSession.accessToken) },
    ),
  );
  const existingUser = usersResult.users.find(
    (user) => user.username.toLowerCase() === testLogin.toLowerCase(),
  );
  let testUserId = existingUser?.id ?? "";

  if (!existingUser) {
    // 階段四-A：帳號不存在時建立 ACTIVE 測試帳號，並直接指派 bootstrap 管理員角色。
    const created = await expectEnvelope<MembershipUser>(
      await request.post(`${backendURL}/api/membership/users`, {
        headers: authHeaders(bootstrapSession.accessToken, true),
        data: {
          username: testLogin,
          email: `${testLogin}@example.local`,
          displayName: "Playwright Test User",
          employeeNo: "E2E-PLAYWRIGHT",
          organizationId: null,
          departmentId: null,
          positionId: null,
          status: "ACTIVE",
          locale: "zh-TW",
          timezone: "Asia/Taipei",
          password: testPassword,
          mustChangePassword: false,
          roleIds: adminRoleResult.roleIds,
        },
      }),
    );
    testUserId = created.id;
  } else {
    // 階段四-B：帳號已存在時同步基本資料、重設密碼並解除可能的鎖定狀態。
    await expectEnvelope<MembershipUser>(
      await request.put(`${backendURL}/api/membership/users/${testUserId}`, {
        headers: authHeaders(bootstrapSession.accessToken, true),
        data: {
          username: testLogin,
          email: existingUser.email || `${testLogin}@example.local`,
          displayName: existingUser.displayName || "Playwright Test User",
          employeeNo: existingUser.employeeNo || "E2E-PLAYWRIGHT",
          organizationId: existingUser.organizationId,
          departmentId: existingUser.departmentId,
          positionId: existingUser.positionId,
          status: "ACTIVE",
          locale: existingUser.locale || "zh-TW",
          timezone: existingUser.timezone || "Asia/Taipei",
          roleIds: adminRoleResult.roleIds,
        },
      }),
    );
    await expectEnvelope<MembershipUser>(
      await request.put(`${backendURL}/api/membership/users/${testUserId}/reset-password`, {
        headers: authHeaders(bootstrapSession.accessToken, true),
        data: { newPassword: testPassword, mustChangePassword: false },
      }),
    );
    await expectEnvelope<MembershipUser>(
      await request.post(`${backendURL}/api/membership/users/${testUserId}/unlock`, {
        headers: authHeaders(bootstrapSession.accessToken),
      }),
    );
  }

  // 階段五：再次同步完整角色集合，驗證測試帳號與 bootstrap 管理員角色一致。
  const synchronizedRoles = await expectEnvelope<{ userId: string; roleIds: string[] }>(
    await request.put(`${backendURL}/api/membership/rbac/users/${testUserId}/roles`, {
      headers: authHeaders(bootstrapSession.accessToken, true),
      data: { roleIds: adminRoleResult.roleIds, organizationId: null },
    }),
  );
  expect(new Set(synchronizedRoles.roleIds)).toEqual(new Set(adminRoleResult.roleIds));

  // 階段六：以測試帳號登入，比對最終 permission 集合與 bootstrap 管理員完全一致。
  const testSession = await login(request, testLogin, testPassword);
  const testPermissions = await expectEnvelope<{ permissions: string[] }>(
    await request.get(`${backendURL}/api/membership/rbac/me/permissions`, {
      headers: authHeaders(testSession.accessToken),
    }),
  );
  const adminPermissions = await expectEnvelope<{ permissions: string[] }>(
    await request.get(`${backendURL}/api/membership/rbac/me/permissions`, {
      headers: authHeaders(bootstrapSession.accessToken),
    }),
  );
  expect(new Set(testPermissions.permissions)).toEqual(new Set(adminPermissions.permissions));

  // 階段七：從 WEB 登入並驗證 localStorage 保存正確的測試帳號身分。
  await page.goto("/login");
  await page.locator("#login-account-input").fill(testLogin);
  await page.locator("#login-password-input").fill(testPassword);
  await page.locator("#login-submit-button").click();
  await page.waitForURL((url) => url.pathname === "/");
  const storedUser = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("membership.user") ?? "null"),
  );
  expect(storedUser?.username).toBe(testLogin);

  // 階段八：保存已登入的 storage state，供後續 Chromium 測試案例共用。
  await mkdir(dirname(testUserStorageState), { recursive: true });
  await page.context().storageState({ path: testUserStorageState });
});

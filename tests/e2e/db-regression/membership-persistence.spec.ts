import { expect, test } from "@playwright/test";

import { backendURL } from "../support/audit-log";
import {
  authHeaders,
  deleteIfPresent,
  expectEnvelope,
  loginAsAdmin,
  uniqueSuffix,
} from "../support/db-regression";

type MembershipUser = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  organizationId: string | null;
  departmentId: string | null;
  positionId: string | null;
  status: string;
  lockedUntil: string | null;
  mustChangePassword: boolean;
};

type Role = {
  id: string;
  code: string;
  name: string;
  permissionCount: number;
  userCount: number;
};

type Permission = { id: string; code: string; name: string };

async function getDefaultRoleId(
  request: import("@playwright/test").APIRequestContext,
  accessToken: string,
): Promise<string> {
  const response = await request.get(`${backendURL}/api/membership/rbac/roles`, {
    headers: authHeaders(accessToken),
  });
  const roles = await expectEnvelope<Role[]>(response);
  const defaultRole = roles.find((role) => role.code === "DEFAULT_USER") ?? roles[0];
  expect(defaultRole, "測試 DB 至少需要一個可指派角色").toBeTruthy();
  return defaultRole.id;
}

test("TC-DB-USER-001 使用者生命週期、篩選、鎖定與密碼更新皆持久化", async ({
  page,
}) => {
  test.setTimeout(120_000);

  // 階段一：準備唯一帳號、原始／新密碼及預設角色。
  const suffix = uniqueSuffix();
  const username = `e2e.sa.${suffix}`;
  const originalPassword = "E2eOriginal123!";
  const newPassword = "E2eChanged456!";
  let userId = "";
  const { accessToken } = await loginAsAdmin(page);
  const roleId = await getDefaultRoleId(page.request, accessToken);

  try {
    // 階段二：建立 ACTIVE 使用者，驗證 API 回傳並保存新使用者 ID。
    const createResponse = await page.request.post(`${backendURL}/api/membership/users`, {
      headers: authHeaders(accessToken, true),
      data: {
        username,
        email: `${username}@example.local`,
        displayName: `SQLAlchemy 使用者 ${suffix}`,
        employeeNo: `EMP-${suffix}`,
        organizationId: null,
        departmentId: null,
        positionId: null,
        status: "ACTIVE",
        locale: "zh-TW",
        timezone: "Asia/Taipei",
        password: originalPassword,
        mustChangePassword: false,
        roleIds: [roleId],
      },
    });
    const created = await expectEnvelope<MembershipUser>(createResponse);
    userId = created.id;

    // 階段三：從使用者管理頁找到帳號，並驗證 reload 後仍可由 DB 載入。
    await page.goto("/membership/users");
    await expect(page.getByText(username, { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText(username, { exact: true })).toBeVisible({ timeout: 10_000 });

    // 階段四：以 keyword 與 ACTIVE 狀態查詢，驗證只回傳本次建立的使用者。
    const listResponse = await page.request.get(
      `${backendURL}/api/membership/users?page=1&pageSize=10&keyword=${encodeURIComponent(suffix)}&status=ACTIVE`,
      { headers: authHeaders(accessToken) },
    );
    const list = await expectEnvelope<{ users: MembershipUser[]; total: number }>(listResponse);
    expect(list.total).toBe(1);
    expect(list.users[0].id).toBe(userId);

    // 階段五：鎖定帳號，驗證 lockedUntil、鎖定篩選及登入拒絕皆生效。
    const lockResponse = await page.request.post(
      `${backendURL}/api/membership/users/${userId}/lock`,
      { headers: authHeaders(accessToken, true), data: {} },
    );
    expect((await expectEnvelope<MembershipUser>(lockResponse)).lockedUntil).not.toBeNull();

    const lockedListResponse = await page.request.get(
      `${backendURL}/api/membership/users?page=1&pageSize=10&keyword=${encodeURIComponent(suffix)}&locked=true`,
      { headers: authHeaders(accessToken) },
    );
    expect((await expectEnvelope<{ users: MembershipUser[] }>(lockedListResponse)).users).toHaveLength(1);

    const lockedLogin = await page.request.post(`${backendURL}/api/membership/auth/login`, {
      data: { login: username, password: originalPassword, rememberMe: false },
    });
    expect(lockedLogin.ok()).toBe(false);

    // 階段六：解鎖並重設密碼，驗證新密碼可登入、舊密碼已失效。
    await expectEnvelope<MembershipUser>(
      await page.request.post(`${backendURL}/api/membership/users/${userId}/unlock`, {
        headers: authHeaders(accessToken),
      }),
    );
    await expectEnvelope<MembershipUser>(
      await page.request.put(`${backendURL}/api/membership/users/${userId}/reset-password`, {
        headers: authHeaders(accessToken, true),
        data: { newPassword, mustChangePassword: false },
      }),
    );

    const newPasswordLogin = await page.request.post(`${backendURL}/api/membership/auth/login`, {
      data: { login: username, password: newPassword, rememberMe: false },
    });
    expect(newPasswordLogin.ok()).toBe(true);
    const oldPasswordLogin = await page.request.post(`${backendURL}/api/membership/auth/login`, {
      data: { login: username, password: originalPassword, rememberMe: false },
    });
    expect(oldPasswordLogin.ok()).toBe(false);

    // 階段七：停用帳號，驗證即使使用新密碼也無法登入。
    await expectEnvelope<MembershipUser>(
      await page.request.post(`${backendURL}/api/membership/users/${userId}/deactivate`, {
        headers: authHeaders(accessToken),
      }),
    );
    const inactiveLogin = await page.request.post(`${backendURL}/api/membership/auth/login`, {
      data: { login: username, password: newPassword, rememberMe: false },
    });
    expect(inactiveLogin.ok()).toBe(false);

    // 階段八：刪除使用者並查詢確認不再回傳任何符合資料。
    await deleteIfPresent(page.request, `/api/membership/users/${userId}`, accessToken);
    userId = "";
    const deletedList = await expectEnvelope<{ users: MembershipUser[] }>(
      await page.request.get(
        `${backendURL}/api/membership/users?page=1&pageSize=10&keyword=${encodeURIComponent(suffix)}`,
        { headers: authHeaders(accessToken) },
      ),
    );
    expect(deletedList.users).toHaveLength(0);
  } finally {
    // 階段九：若案例中途失敗，補做使用者刪除。
    if (userId) await deleteIfPresent(page.request, `/api/membership/users/${userId}`, accessToken);
  }
});

test("TC-DB-RBAC-001 角色、權限 mapping 與使用者角色關聯可完整寫入及解除", async ({
  page,
}) => {
  test.setTimeout(120_000);

  // 階段一：準備唯一角色名稱並取得管理員授權。
  const suffix = uniqueSuffix();
  const roleName = `E2E SQLAlchemy Role ${suffix}`;
  let roleId = "";
  let userId = "";
  const { accessToken } = await loginAsAdmin(page);

  try {
    // 階段二：讀取可用權限並選取兩筆，作為新角色的 permission mapping。
    const permissions = await expectEnvelope<Permission[]>(
      await page.request.get(`${backendURL}/api/membership/rbac/permissions?status=ACTIVE`, {
        headers: authHeaders(accessToken),
      }),
    );
    expect(permissions.length).toBeGreaterThan(1);
    const selectedPermissionIds = permissions.slice(0, 2).map((permission) => permission.id);

    // 階段三：建立自訂角色並保存 roleId。
    const role = await expectEnvelope<Role>(
      await page.request.post(`${backendURL}/api/membership/rbac/roles`, {
        headers: authHeaders(accessToken, true),
        data: {
          name: roleName,
          description: `含 Unicode 與引號 ' 的角色 ${suffix}`,
          roleType: "BUSINESS",
          status: "ACTIVE",
          isSystem: false,
        },
      }),
    );
    roleId = role.id;

    // 階段四：寫入角色權限 mapping，驗證回傳 ID 集合與預期完全一致。
    const mapping = await expectEnvelope<{ roleId: string; permissionIds: string[] }>(
      await page.request.put(`${backendURL}/api/membership/rbac/roles/${roleId}/permissions`, {
        headers: authHeaders(accessToken, true),
        data: { ids: selectedPermissionIds },
      }),
    );
    expect(new Set(mapping.permissionIds)).toEqual(new Set(selectedPermissionIds));

    // 階段五：從角色管理 UI 確認新角色可見，且 reload 後仍然存在。
    await page.goto("/membership/roles");
    await expect(page.getByText(roleName, { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText(roleName, { exact: true })).toBeVisible();

    // 階段六：建立指派該角色的測試使用者。
    const user = await expectEnvelope<MembershipUser>(
      await page.request.post(`${backendURL}/api/membership/users`, {
        headers: authHeaders(accessToken, true),
        data: {
          username: `e2e.rbac.${suffix}`,
          email: `e2e.rbac.${suffix}@example.local`,
          displayName: `E2E RBAC User ${suffix}`,
          employeeNo: "",
          organizationId: null,
          departmentId: null,
          positionId: null,
          status: "ACTIVE",
          locale: "zh-TW",
          timezone: "Asia/Taipei",
          password: "E2eRbac123!",
          mustChangePassword: false,
          roleIds: [roleId],
        },
      }),
    );
    userId = user.id;

    // 階段七：查詢使用者角色，驗證關聯只包含本次建立的角色。
    const userRoles = await expectEnvelope<{ userId: string; roleIds: string[] }>(
      await page.request.get(`${backendURL}/api/membership/rbac/users/${userId}/roles`, {
        headers: authHeaders(accessToken),
      }),
    );
    expect(userRoles.roleIds).toEqual([roleId]);

    // 階段八：解除角色關聯後刪除使用者與角色，避免外鍵關聯阻擋清理。
    await expectEnvelope<{ userId: string; roleIds: string[] }>(
      await page.request.put(`${backendURL}/api/membership/rbac/users/${userId}/roles`, {
        headers: authHeaders(accessToken, true),
        data: { roleIds: [], organizationId: null },
      }),
    );
    await deleteIfPresent(page.request, `/api/membership/users/${userId}`, accessToken);
    userId = "";
    await deleteIfPresent(page.request, `/api/membership/rbac/roles/${roleId}`, accessToken);
    roleId = "";

    // 階段九：依角色名稱查詢，驗證已刪除角色不再出現。
    const roles = await expectEnvelope<Role[]>(
      await page.request.get(
        `${backendURL}/api/membership/rbac/roles?keyword=${encodeURIComponent(roleName)}`,
        { headers: authHeaders(accessToken) },
      ),
    );
    expect(roles).toHaveLength(0);
  } finally {
    // 階段十：若案例中途失敗，依使用者、角色順序補做清理。
    if (userId) await deleteIfPresent(page.request, `/api/membership/users/${userId}`, accessToken);
    if (roleId) await deleteIfPresent(page.request, `/api/membership/rbac/roles/${roleId}`, accessToken);
  }
});

test("TC-DB-CONSTRAINT-001 重複帳號寫入失敗且不留下半套資料", async ({ page }) => {
  // 階段一：準備使用相同 username 的兩次建立請求資料。
  const suffix = uniqueSuffix();
  const username = `e2e.duplicate.${suffix}`;
  let userId = "";
  const { accessToken } = await loginAsAdmin(page);
  const roleId = await getDefaultRoleId(page.request, accessToken);
  const payload = {
    username,
    email: `${username}@example.local`,
    displayName: `E2E Duplicate ${suffix}`,
    employeeNo: "",
    organizationId: null,
    departmentId: null,
    positionId: null,
    status: "ACTIVE",
    locale: "zh-TW",
    timezone: "Asia/Taipei",
    password: "E2eDuplicate123!",
    mustChangePassword: false,
    roleIds: [roleId],
  };

  try {
    // 階段二：第一次建立應成功，並保存產生的 userId。
    const first = await expectEnvelope<MembershipUser>(
      await page.request.post(`${backendURL}/api/membership/users`, {
        headers: authHeaders(accessToken, true),
        data: payload,
      }),
    );
    userId = first.id;
    // 階段三：第二次使用相同 username 建立應失敗，且回傳合理的 constraint 狀態碼。
    const duplicate = await page.request.post(`${backendURL}/api/membership/users`, {
      headers: authHeaders(accessToken, true),
      data: { ...payload, email: `second-${payload.email}` },
    });
    expect(duplicate.ok()).toBe(false);
    expect([400, 409, 422]).toContain(duplicate.status());

    // 階段四：查詢 username，驗證 DB 僅保留第一次成功建立的一筆資料。
    const list = await expectEnvelope<{ users: MembershipUser[]; total: number }>(
      await page.request.get(
        `${backendURL}/api/membership/users?page=1&pageSize=10&keyword=${encodeURIComponent(username)}`,
        { headers: authHeaders(accessToken) },
      ),
    );
    expect(list.total).toBe(1);
    expect(list.users).toHaveLength(1);
  } finally {
    // 階段五：刪除第一次成功建立的測試使用者。
    if (userId) await deleteIfPresent(page.request, `/api/membership/users/${userId}`, accessToken);
  }
});
